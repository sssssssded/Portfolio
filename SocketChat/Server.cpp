#include <iostream>
#include <string>
#include <thread>
#include <vector>
#include <mutex>
#include <atomic>
#include <unordered_set>
#include <WinSock2.h>

// 소켓 라이브러리 사용.
#pragma comment(lib, "ws2_32.lib")

constexpr unsigned short SERVER_PORT = 10010;
constexpr int            BUFFER_SIZE = 256;

// 접속중인 클라이언트 소켓 목록.
// 여러 스레드(accept 하는 메인 스레드, 클라이언트별 RecvThread)가 동시에 접근하므로
// 반드시 mutex로 보호해야 한다.
std::unordered_set<SOCKET> gSockets;
std::mutex                 gSocketsMutex;

// 콘솔 출력도 여러 스레드가 동시에 하면 글자가 섞이므로 따로 보호한다.
std::mutex gLogMutex;

// 서버 동작 여부. 콘솔에 exit 입력 시 false가 된다.
std::atomic<bool> gRunning = true;

void Log(const std::string& Message)
{
    std::lock_guard<std::mutex> Lock(gLogMutex);
    std::cout << Message << std::endl;
}

// Sender를 제외한 모든 클라이언트에게 데이터를 보낸다.
void Broadcast(SOCKET Sender, const std::string& Message)
{
    std::lock_guard<std::mutex> Lock(gSocketsMutex);

    for (SOCKET Other : gSockets)
    {
        if (Other == Sender)
            continue;

        send(Other, Message.c_str(), (int)Message.size(), 0);
    }
}

void RecvThread(SOCKET Socket)
{
    char RecvData[BUFFER_SIZE];

    while (true)
    {
        // 마지막 1바이트는 문자열 끝('\0')을 넣기 위해 비워둔다.
        int Size = recv(Socket, RecvData, BUFFER_SIZE - 1, 0);

        // 0 : 클라이언트가 정상 종료(exit), 음수 : 강제 종료 등 오류
        if (Size <= 0)
            break;

        RecvData[Size] = '\0';

        std::string Message = "[" + std::to_string(Socket) + "] " + RecvData;

        Log(Message);
        Broadcast(Socket, Message);
    }

    size_t Remain = 0;
    bool   Owner = false;
    {
        std::lock_guard<std::mutex> Lock(gSocketsMutex);
        // 목록에 아직 있으면 내가 닫는다.
        // 서버 종료(exit) 시에는 메인 스레드가 이미 닫고 목록에서 지웠으므로 닫지 않는다. (두번 닫기 방지)
        Owner = gSockets.erase(Socket) > 0;
        Remain = gSockets.size();
    }

    if (!Owner)
        return;

    // 소켓은 다 썼으면 반드시 제거해야 된다.
    closesocket(Socket);

    std::string Notice = "[" + std::to_string(Socket) + "] 님이 나갔습니다.";
    Log(Notice + " (현재 접속자 : " + std::to_string(Remain) + ")");

    if (gRunning)
        Broadcast(INVALID_SOCKET, Notice);
}

// 서버 콘솔에서 exit를 입력받으면 서버를 종료시킨다.
void InputThread(SOCKET ListenSocket)
{
    std::string Line;

    while (std::getline(std::cin, Line))
    {
        if (Line == "exit")
            break;
    }

    gRunning = false;

    // accept에서 대기중인 메인 스레드를 깨우기 위해 ListenSocket을 닫는다.
    // 닫힌 소켓으로 대기중이던 accept는 INVALID_SOCKET을 반환하며 빠져나온다.
    closesocket(ListenSocket);
}

int main()
{
    WSADATA wsaData;

    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0)
    {
        std::cout << "WSAStartup 실패" << std::endl;
        return -1;
    }

    SOCKET ListenSocket = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);

    if (ListenSocket == INVALID_SOCKET)
    {
        std::cout << "socket 생성 실패 : " << WSAGetLastError() << std::endl;
        WSACleanup();
        return -1;
    }

    SOCKADDR_IN ListenAddr = {};
    ListenAddr.sin_family = AF_INET;
    ListenAddr.sin_port = htons(SERVER_PORT);
    // 로컬 테스트용. 같은 PC(127.0.0.1)에서 들어오는 접속만 받는다.
    // 다른 PC에서도 접속하게 하려면 INADDR_ANY로 바꾸면 된다.
    ListenAddr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);

    if (bind(ListenSocket, (SOCKADDR*)&ListenAddr, sizeof(ListenAddr)) == SOCKET_ERROR)
    {
        std::cout << "bind 실패 (포트가 이미 사용중일 수 있음) : " << WSAGetLastError() << std::endl;
        closesocket(ListenSocket);
        WSACleanup();
        return -1;
    }

    if (listen(ListenSocket, SOMAXCONN) == SOCKET_ERROR)
    {
        std::cout << "listen 실패 : " << WSAGetLastError() << std::endl;
        closesocket(ListenSocket);
        WSACleanup();
        return -1;
    }

    Log("서버 시작 : 127.0.0.1:" + std::to_string(SERVER_PORT));
    Log("종료하려면 exit 를 입력하세요.");

    std::thread              Input(InputThread, ListenSocket);
    std::vector<std::thread> ThreadArray;

    // MainThread에서는 접속 승인만 해준다.
    while (gRunning)
    {
        SOCKADDR_IN ClientAddr = {};
        int         ClientAddrSize = sizeof(ClientAddr);

        SOCKET ClientSocket = accept(ListenSocket, (SOCKADDR*)&ClientAddr, &ClientAddrSize);

        if (ClientSocket == INVALID_SOCKET)
        {
            // exit 입력으로 ListenSocket이 닫힌 경우
            if (!gRunning)
                break;

            continue;
        }

        size_t Count = 0;
        {
            std::lock_guard<std::mutex> Lock(gSocketsMutex);
            gSockets.insert(ClientSocket);
            Count = gSockets.size();
        }

        std::string Notice = "[" + std::to_string(ClientSocket) + "] 님이 들어왔습니다.";
        Log(Notice + " (현재 접속자 : " + std::to_string(Count) + ")");
        Broadcast(ClientSocket, Notice);

        ThreadArray.emplace_back(RecvThread, ClientSocket);
    }

    Log("서버를 종료합니다...");

    // 남아있는 클라이언트 소켓을 모두 닫는다.
    // 닫힌 소켓에서 대기중이던 각 RecvThread의 recv는 오류(-1)를 반환하며 빠져나온다.
    {
        std::lock_guard<std::mutex> Lock(gSocketsMutex);
        for (SOCKET Other : gSockets)
            closesocket(Other);

        gSockets.clear();
    }

    for (auto& Thread : ThreadArray)
        Thread.join();

    Input.join();

    WSACleanup();

    return 0;
}
