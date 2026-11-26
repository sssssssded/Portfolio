총알, 이펙트처럼 **짧은 시간에 많이 생성되고 사라지는 오브젝트**는 매번 `Instantiate` / `Destroy` 하면 GC가 자주 발생해 프레임이 끊깁니다. 이럴 때 쓰는 방법이 오브젝트 풀링입니다.

## 기본 아이디어

1. 미리 일정 개수를 만들어 비활성화해 둔다
2. 필요하면 꺼내서 활성화한다
3. 다 쓰면 파괴하지 않고 다시 넣어 둔다

## 구현

```csharp
public class ObjectPool : MonoBehaviour
{
    [SerializeField] private GameObject prefab;
    [SerializeField] private int prewarm = 20;
    private readonly Queue<GameObject> pool = new();

    void Awake()
    {
        for (int i = 0; i < prewarm; i++)
            Release(Instantiate(prefab, transform));
    }

    public GameObject Get()
    {
        var obj = pool.Count > 0 ? pool.Dequeue() : Instantiate(prefab, transform);
        obj.SetActive(true);
        return obj;
    }

    public void Release(GameObject obj)
    {
        obj.SetActive(false);
        pool.Enqueue(obj);
    }
}
```

## Unity 기본 제공 풀

Unity 2021 이후에는 `UnityEngine.Pool.ObjectPool<T>`가 기본 제공됩니다. 직접 만들기 전에 먼저 검토해 보세요.

## 정리

- 생성/삭제가 잦은 오브젝트에만 적용한다
- 꺼낼 때 상태(위치, 속도, 체력 등)를 반드시 초기화한다
- 프로파일러로 GC Alloc이 실제로 줄었는지 확인한다
