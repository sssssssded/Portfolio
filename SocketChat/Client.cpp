#include <iostream>
#include <string>
#include <thread>
#include <atomic>
#include <WinSock2.h>
#include <WS2tcpip.h>   // inet_pton

// 소켓 라이브러리 사용.
#pragma comment(lib, "ws2_32.lib")

constexpr const char*    SERVER_IP = "127.0.0.1";   // 로컬
constexpr unsigned short SERVER_PORT = 10010;
constexpr int            BUFFER_SIZE = 256;

// 서버와 연결되어 있는지 여부.
std::atomic<bool> gConnected = true;

// 서버가 보내주는 다른 클라이언트의 메시지를 받아서 출력한다.
// 입력(getline)과 수신(recv)은 둘 다 대기하는 함수이므로 스레드를 나눠야 한다.
void RecvThread(SOCKET Socket)
{
    char RecvData[BUFFER_SIZE];

    while (true)
    {
        int Size = recv(Socket, RecvData, BUFFER_SIZE - 1, 0);

        // 0 : 서버가 연결을 끊음, 음수 : 오류 또는 내가 exit로 소켓을 닫음
        if (Size <= 0)
            break;

        RecvData[Size] = '\0';
        std::cout << RecvData << std::endl;
    }

    // 내가 exit를 입력한 게 아니라 서버쪽에서 끊긴 경우
    if (gConnected.exchange(false))
        std::cout << "서버와의 연결이 끊어졌습니다. 엔터를 누르면 종료됩니다." << std::endl;
}

int main()
{
    WSADATA wsaData;

    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0)
    {
        std::cout << "WSAStartup 실패" << std::endl;
        return -1;
    }

    SOCKET Socket = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);

    if (Socket == INVALID_SOCKET)
    {
        std::cout << "socket 생성 실패 : " << WSAGetLastError() << std::endl;
        WSACleanup();
        return -1;
    }

    // 접속할 서버의 주소.
    SOCKADDR_IN ServerAddr = {};
    ServerAddr.sin_family = AF_INET;
    ServerAddr.sin_port = htons(SERVER_PORT);
    inet_pton(AF_INET, SERVER_IP, &ServerAddr.sin_addr);

    // connect : 서버에 접속 요청. 서버의 accept가 승인해주면 성공한다.
    if (connect(Socket, (SOCKADDR*)&ServerAddr, sizeof(ServerAddr)) == SOCKET_ERROR)
    {
        std::cout << "서버 접속 실패 (서버가 켜져 있는지 확인) : " << WSAGetLastError() << std::endl;
        closesocket(Socket);
        WSACleanup();
        return -1;
    }

    std::cout << "서버 접속 성공 : " << SERVER_IP << ":" << SERVER_PORT << std::endl;
    std::cout << "메시지를 입력하세요. (exit 입력 시 종료)" << std::endl;

    std::thread Recv(RecvThread, Socket);

    std::string Line;

    while (std::getline(std::cin, Line))
    {
        // 서버가 먼저 끊은 경우
        if (!gConnected)
            break;

        if (Line == "exit")
            break;

        if (Line.empty())
            continue;

        if (send(Socket, Line.c_str(), (int)Line.size(), 0) == SOCKET_ERROR)
        {
            std::cout << "전송 실패 : " << WSAGetLastError() << std::endl;
            break;
        }
    }

    // RecvThread에서 "연결 끊김" 메시지를 출력하지 않도록 먼저 false로 만든다.
    gConnected = false;

    // shutdown : 더 이상 주고받지 않겠다고 서버에 알린다.
    // 서버의 recv는 0을 반환하고, 이쪽 RecvThread의 recv도 깨어나서 빠져나온다.
    shutdown(Socket, SD_BOTH);

    Recv.join();

    closesocket(Socket);

    WSACleanup();

    std::cout << "클라이언트를 종료합니다." << std::endl;

    return 0;
}
