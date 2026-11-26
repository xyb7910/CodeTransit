import { AlgorithmCategory, RepositoryEntry, WorkspaceDocument } from '../types/workspace';
import { createDefaultWorkspace } from './carbon';

export const ALGORITHM_CATEGORIES: { id: AlgorithmCategory; zh: string; en: string }[] = [
  { id: 'basic', zh: '基础算法', en: 'Basic Algorithms' },
  { id: 'search', zh: '搜索与剪枝', en: 'Search & Pruning' },
  { id: 'data-structure', zh: '数据结构', en: 'Data Structures' },
  { id: 'dp', zh: '动态规划', en: 'Dynamic Programming' },
  { id: 'graph', zh: '图论', en: 'Graph Theory' },
  { id: 'string', zh: '字符串', en: 'Strings' },
  { id: 'number-theory', zh: '数论', en: 'Number Theory' },
  { id: 'combinatorics', zh: '组合数学', en: 'Combinatorics' },
  { id: 'geometry', zh: '计算几何', en: 'Computational Geometry' },
  { id: 'advanced', zh: '高级算法', en: 'Advanced Algorithms' },
];

function makeRepoWorkspace(
  id: string,
  title: string,
  problemCode: string,
  platform: string,
  difficulty: string,
  tags: string[],
  code: string,
  fileName: string,
  timeComplexity: string,
  spaceComplexity: string,
  formulaTitle: string,
  formulaLatex: string,
  teachingNote: string,
  sampleIn: string,
  sampleOut: string
): WorkspaceDocument {
  const base = createDefaultWorkspace();
  return {
    ...base,
    id,
    name: title,
    templatePreset: 'template-mode',
    blocks: [
      { id: `${id}-title`, type: 'title', visible: true, collapsed: false },
      { id: `${id}-complexity`, type: 'complexity', visible: true, collapsed: false },
      { id: `${id}-formula`, type: 'formula', visible: true, collapsed: false },
      { id: `${id}-code`, type: 'code', visible: true, collapsed: false },
      { id: `${id}-samples`, type: 'samples', visible: true, collapsed: false },
      { id: `${id}-teaching`, type: 'teaching', visible: true, collapsed: false },
      { id: `${id}-author`, type: 'author', visible: true, collapsed: false },
    ],
    canvasStyle: {
      ...base.canvasStyle,
      windowTitle: fileName,
    },
    titleData: {
      problemTitle: title,
      algorithmName: tags[0] || title,
      problemCode,
      platform,
      sourceUrl: '',
      difficulty,
      tags,
      starred: true,
    },
    codeData: {
      language: 'cpp17',
      fileName,
      code,
      annotations: [],
      dimUnfocused: false,
    },
    complexityData: {
      timeComplexity,
      spaceComplexity,
      notes: '',
    },
    formulaData: {
      title: formulaTitle,
      latex: formulaLatex,
      caption: '',
    },
    teachingData: {
      explanation: teachingNote,
      pitfalls: '',
      checklist: [],
    },
    samplesData: {
      layout: 'split',
      diffMode: 'token',
      floatEpsilon: 1e-6,
      cases: [
        {
          id: `${id}-smp-1`,
          name: '标准样例 #1',
          type: 'official',
          input: sampleIn,
          expectedOutput: sampleOut,
          actualOutput: '',
          explanation: '',
          collapsed: false,
        },
      ],
    },
  };
}

export const SEED_REPOSITORY: RepositoryEntry[] = [
  {
    id: 'repo-binary-search',
    title: '整数二分查找标准模板',
    tier: 'CSP-J',
    category: 'basic',
    kind: 'standard',
    difficulty: '普及-',
    stars: 5,
    favorite: true,
    tags: ['二分查找', '单调性', '基础模板'],
    summary: '左闭右闭与下界 lower_bound 写法，杜绝死循环与边界 off-by-one。',
    updatedAt: Date.now() - 86400000 * 6,
    workspace: makeRepoWorkspace(
      'ws-bsearch',
      '整数二分查找标准模板',
      'P2249',
      '洛谷 / CSP-J',
      '普及-',
      ['二分查找', '基础算法'],
      `#include <bits/stdc++.h>
using namespace std;

// 查找第一个 >= target 的下标，不存在返回 -1
int lowerBoundIdx(const vector<int>& a, int target) {
    int l = 0, r = (int)a.size() - 1, ans = -1;
    while (l <= r) {
        int mid = l + ((r - l) >> 1);
        if (a[mid] >= target) {
            ans = mid;
            r = mid - 1;
        } else {
            l = mid + 1;
        }
    }
    return ans;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n, q;
    cin >> n >> q;
    vector<int> a(n);
    for (int& x : a) cin >> x;
    while (q--) {
        int x;
        cin >> x;
        int idx = lowerBoundIdx(a, x);
        cout << (idx != -1 && a[idx] == x ? idx + 1 : -1) << ' ';
    }
    return 0;
}`,
      'binary_search.cpp',
      'O(n + q \\log n)',
      'O(n)',
      '二分搜索区间收缩条件',
      'mid = l + \\lfloor (r - l) / 2 \\rfloor',
      '使用 ans 记录合法候选位置并严格让 l = mid + 1 或 r = mid - 1，避免记住两套加一减一模板导致死循环。',
      '11 3\n1 3 3 3 5 7 9 11 13 15 15\n1 3 6',
      '1 2 -1'
    ),
  },
  {
    id: 'repo-knapsack-01',
    title: '0/1 背包与采药经典题',
    tier: 'CSP-J',
    category: 'dp',
    kind: 'classic',
    difficulty: '普及-',
    stars: 5,
    favorite: true,
    tags: ['动态规划', '0/1背包', 'NOIP'],
    summary: 'P1048 采药一维滚动数组标准解法，附倒序遍历原理分析。',
    updatedAt: Date.now() - 86400000 * 5,
    workspace: createDefaultWorkspace(),
  },
  {
    id: 'repo-bfs-maze',
    title: 'BFS 迷宫最短路模板',
    tier: 'CSP-J',
    category: 'search',
    kind: 'standard',
    difficulty: '普及-',
    stars: 4,
    favorite: false,
    tags: ['BFS', '队列', '网格图'],
    summary: '四方向网格最短路 BFS，入队即标记访问防止重复入队超时。',
    updatedAt: Date.now() - 86400000 * 4,
    workspace: makeRepoWorkspace(
      'ws-bfs',
      'BFS 迷宫最短路模板',
      'BFS-GRID',
      '基础模板',
      '普及-',
      ['BFS', '搜索'],
      `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n, m;
    cin >> n >> m;
    vector<string> g(n);
    for (int i = 0; i < n; ++i) cin >> g[i];

    vector<vector<int>> dist(n, vector<int>(m, -1));
    queue<pair<int, int>> q;
    dist[0][0] = 0;
    q.push({0, 0});

    const int dx[4] = {1, -1, 0, 0};
    const int dy[4] = {0, 0, 1, -1};

    while (!q.empty()) {
        auto [x, y] = q.front();
        q.pop();
        for (int d = 0; d < 4; ++d) {
            int nx = x + dx[d], ny = y + dy[d];
            if (nx >= 0 && nx < n && ny >= 0 && ny < m && g[nx][ny] == '.' && dist[nx][ny] == -1) {
                dist[nx][ny] = dist[x][y] + 1;
                q.push({nx, ny});
            }
        }
    }
    cout << dist[n - 1][m - 1] << '\\n';
    return 0;
}`,
      'bfs_maze.cpp',
      'O(n \\cdot m)',
      'O(n \\cdot m)',
      '边权全为 1 的最短路径',
      'dist[nx][ny] = dist[x][y] + 1',
      '务必在入队（push）时立刻设置 dist[nx][ny]，而不是出队时再标记，否则网格节点会被重复压入队列引发 MLE/TLE。',
      '3 3\n..#\n#..\n#..',
      '4'
    ),
  },
  {
    id: 'repo-segtree-lazy',
    title: '线段树区间加与区间求和（Lazy 标记）',
    tier: 'CSP-S',
    category: 'data-structure',
    kind: 'standard',
    difficulty: '普及+/提高',
    stars: 5,
    favorite: true,
    tags: ['线段树', 'Lazy标记', '数据结构'],
    summary: '洛谷 P3372 标准线段树，支持 long long 区间修改与区间查询。',
    updatedAt: Date.now() - 86400000 * 3,
    workspace: makeRepoWorkspace(
      'ws-segtree',
      '线段树区间加与区间求和',
      'P3372',
      '洛谷模板',
      '普及+/提高',
      ['线段树', '数据结构'],
      `#include <bits/stdc++.h>
using namespace std;
using ll = long long;

struct SegTree {
    int n;
    vector<ll> sum, add;
    SegTree(int n) : n(n), sum(4 * n + 5), add(4 * n + 5) {}

    void pushUp(int p) { sum[p] = sum[p << 1] + sum[p << 1 | 1]; }

    void apply(int p, int l, int r, ll v) {
        sum[p] += (r - l + 1) * v;
        add[p] += v;
    }

    void pushDown(int p, int l, int r) {
        if (add[p] == 0) return;
        int mid = (l + r) >> 1;
        apply(p << 1, l, mid, add[p]);
        apply(p << 1 | 1, mid + 1, r, add[p]);
        add[p] = 0;
    }

    void build(int p, int l, int r, const vector<ll>& a) {
        if (l == r) { sum[p] = a[l]; return; }
        int mid = (l + r) >> 1;
        build(p << 1, l, mid, a);
        build(p << 1 | 1, mid + 1, r, a);
        pushUp(p);
    }

    void update(int p, int l, int r, int ql, int qr, ll v) {
        if (ql <= l && r <= qr) { apply(p, l, r, v); return; }
        pushDown(p, l, r);
        int mid = (l + r) >> 1;
        if (ql <= mid) update(p << 1, l, mid, ql, qr, v);
        if (qr > mid) update(p << 1 | 1, mid + 1, r, ql, qr, v);
        pushUp(p);
    }

    ll query(int p, int l, int r, int ql, int qr) {
        if (ql <= l && r <= qr) return sum[p];
        pushDown(p, l, r);
        int mid = (l + r) >> 1;
        ll res = 0;
        if (ql <= mid) res += query(p << 1, l, mid, ql, qr);
        if (qr > mid) res += query(p << 1 | 1, mid + 1, r, ql, qr);
        return res;
    }
};`,
      'segtree_lazy.cpp',
      'O((n + m) \\log n)',
      'O(4n)',
      '懒标记下传区间长度加权',
      'sum[p] \\leftarrow sum[p] + (r - l + 1) \\cdot add[p]',
      '线段树空间必须开到 4n；涉及区间累加和务必全程使用 long long 防止乘法溢出。',
      '5 5\n1 5 4 2 3\n2 2 4\n1 2 3 2\n2 3 4\n1 1 5 1\n2 1 4',
      '11\n8\n20'
    ),
  },
  {
    id: 'repo-dijkstra',
    title: '堆优化 Dijkstra 单源最短路',
    tier: 'CSP-S',
    category: 'graph',
    kind: 'standard',
    difficulty: '普及+/提高',
    stars: 5,
    favorite: true,
    tags: ['Dijkstra', '最短路', '优先队列'],
    summary: '适用于非负权有向/无向稀疏图，注意 vis 标记与 64 位距离。',
    updatedAt: Date.now() - 86400000 * 2,
    workspace: makeRepoWorkspace(
      'ws-dijkstra',
      '堆优化 Dijkstra 单源最短路',
      'P4779',
      '洛谷模板',
      '普及+/提高',
      ['Dijkstra', '图论'],
      `#include <bits/stdc++.h>
using namespace std;
using ll = long long;
const ll INF = 4e18;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n, m, s;
    cin >> n >> m >> s;
    vector<vector<pair<int, ll>>> g(n + 1);
    for (int i = 0; i < m; ++i) {
        int u, v; ll w;
        cin >> u >> v >> w;
        g[u].push_back({v, w});
    }

    vector<ll> dist(n + 1, INF);
    vector<bool> vis(n + 1, false);
    priority_queue<pair<ll, int>, vector<pair<ll, int>>, greater<>> pq;
    dist[s] = 0;
    pq.push({0, s});

    while (!pq.empty()) {
        auto [d, u] = pq.top();
        pq.pop();
        if (vis[u]) continue;
        vis[u] = true;
        for (auto [v, w] : g[u]) {
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                pq.push({dist[v], v});
            }
        }
    }
    for (int i = 1; i <= n; ++i) cout << dist[i] << (i == n ? '\\n' : ' ');
    return 0;
}`,
      'dijkstra.cpp',
      'O(m \\log n)',
      'O(n + m)',
      '松弛操作不等式',
      'dist[v] = \\min(dist[v],\\; dist[u] + w(u, v))',
      '堆中可能存在同一节点的多个旧距离副本，出队时必须检查 if (vis[u]) continue; 不可省去。',
      '4 6 1\n1 2 2\n2 3 2\n2 4 1\n1 3 5\n3 4 3\n1 4 4',
      '0 2 4 3'
    ),
  },
  {
    id: 'repo-kmp',
    title: 'KMP 字符串模式匹配（前缀函数）',
    tier: 'NOIP',
    category: 'string',
    kind: 'standard',
    difficulty: '普及+/提高',
    stars: 4,
    favorite: false,
    tags: ['KMP', '前缀函数', '字符串'],
    summary: '使用统一前缀函数 pi 数组实现在线性时间内查找所有出现位置。',
    updatedAt: Date.now() - 86400000,
    workspace: makeRepoWorkspace(
      'ws-kmp',
      'KMP 前缀函数模板',
      'P3375',
      '洛谷模板',
      '普及+/提高',
      ['KMP', '字符串'],
      `#include <bits/stdc++.h>
using namespace std;

vector<int> prefixFunction(const string& s) {
    int n = (int)s.size();
    vector<int> pi(n, 0);
    for (int i = 1; i < n; ++i) {
        int j = pi[i - 1];
        while (j > 0 && s[i] != s[j]) j = pi[j - 1];
        if (s[i] == s[j]) ++j;
        pi[i] = j;
    }
    return pi;
}`,
      'kmp.cpp',
      'O(|S| + |T|)',
      'O(|S| + |T|)',
      '前缀函数递推',
      '\\pi[i] = \\max \\{ k : 0 \\le k < i,\\; s[0..k-1] = s[i-k+1..i] \\}',
      '把模式串 P 与文本串 T 拼成 P + "#" + T 求前缀函数，当 pi[i] == |P| 时即找到一次完整匹配。',
      'ABABABC\nABA',
      '1\n3'
    ),
  },
  {
    id: 'repo-exgcd',
    title: '扩展欧几里得与线性同余方程',
    tier: 'NOIP',
    category: 'number-theory',
    kind: 'variant',
    difficulty: '提高+/省选-',
    stars: 4,
    favorite: false,
    tags: ['ExGCD', '数论', '乘法逆元'],
    summary: '求解 ax + by = gcd(a, b) 的特解及最小非负整数解。',
    updatedAt: Date.now() - 43200000,
    workspace: makeRepoWorkspace(
      'ws-exgcd',
      '扩展欧几里得算法 ExGCD',
      'P1082',
      'NOIP 2012 提高组',
      '提高+/省选-',
      ['数论', 'ExGCD'],
      `#include <bits/stdc++.h>
using namespace std;
using ll = long long;

ll exgcd(ll a, ll b, ll& x, ll& y) {
    if (b == 0) {
        x = 1; y = 0;
        return a;
    }
    ll g = exgcd(b, a % b, y, x);
    y -= (a / b) * x;
    return g;
}

int main() {
    ll a, b, x, y;
    cin >> a >> b;
    exgcd(a, b, x, y);
    cout << (x % b + b) % b << '\\n';
    return 0;
}`,
      'exgcd.cpp',
      'O(\\log \\min(a, b))',
      'O(\\log \\min(a, b))',
      '裴蜀定理与递归回代',
      'ax + by = \\gcd(a, b)',
      '求最小正整数解时使用 (x % mod + mod) % mod 处理负数取模。',
      '3 10',
      '7'
    ),
  },
  {
    id: 'repo-comb-lucas',
    title: '预处理逆元求组合数 & Lucas 定理',
    tier: 'NOIP',
    category: 'combinatorics',
    kind: 'standard',
    difficulty: '提高+/省选-',
    stars: 4,
    favorite: false,
    tags: ['组合数', 'Lucas定理', '费马小定理'],
    summary: '大组合数取模 O(p) 预处理阶乘与阶乘逆元，支持大 n 小质数模 p。',
    updatedAt: Date.now() - 36000000,
    workspace: makeRepoWorkspace(
      'ws-lucas',
      'Lucas 定理求大组合数取模',
      'P3807',
      '洛谷模板',
      '提高+/省选-',
      ['组合数学', 'Lucas'],
      `#include <bits/stdc++.h>
using namespace std;
using ll = long long;

ll qpow(ll a, ll b, ll p) {
    ll res = 1;
    for (; b; b >>= 1, a = a * a % p)
        if (b & 1) res = res * a % p;
    return res;
}

ll C(ll n, ll m, ll p, const vector<ll>& fac, const vector<ll>& inv) {
    if (m > n) return 0;
    return fac[n] * inv[m] % p * inv[n - m] % p;
}

ll lucas(ll n, ll m, ll p, const vector<ll>& fac, const vector<ll>& inv) {
    if (m == 0) return 1;
    return lucas(n / p, m / p, p, fac, inv) * C(n % p, m % p, p, fac, inv) % p;
}`,
      'lucas.cpp',
      'O(p + \\log_p n)',
      'O(p)',
      'Lucas 定理递推式',
      '\\binom{n}{m} \\equiv \\binom{\\lfloor n/p \\rfloor}{\\lfloor m/p \\rfloor} \\binom{n \\bmod p}{m \\bmod p} \\pmod{p}',
      'Lucas 定理要求模数 p 为质数且预处理长度达到 p - 1。',
      '1 2 5',
      '0'
    ),
  },
  {
    id: 'repo-convex-hull',
    title: '二维凸包 Andrew 算法',
    tier: 'ACM',
    category: 'geometry',
    kind: 'standard',
    difficulty: '提高+/省选-',
    stars: 4,
    favorite: false,
    tags: ['计算几何', '凸包', 'Andrew算法'],
    summary: '按 (x, y) 排序后分别构建下凸壳与上凸壳，精度稳定。',
    updatedAt: Date.now() - 24000000,
    workspace: makeRepoWorkspace(
      'ws-convex',
      '二维凸包 Andrew 算法',
      'P2742',
      'ACM / 省选模板',
      '提高+/省选-',
      ['计算几何', '凸包'],
      `#include <bits/stdc++.h>
using namespace std;

struct Pt {
    double x, y;
    bool operator<(const Pt& o) const {
        return x != o.x ? x < o.x : y < o.y;
    }
};

double cross(const Pt& a, const Pt& b, const Pt& c) {
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

vector<Pt> convexHull(vector<Pt> pts) {
    sort(pts.begin(), pts.end());
    int n = (int)pts.size();
    if (n <= 1) return pts;
    vector<Pt> hull;
    for (int i = 0; i < n; ++i) {
        while (hull.size() >= 2 && cross(hull[hull.size()-2], hull.back(), pts[i]) <= 0)
            hull.pop_back();
        hull.push_back(pts[i]);
    }
    int lowerSize = (int)hull.size();
    for (int i = n - 2; i >= 0; --i) {
        while ((int)hull.size() > lowerSize && cross(hull[hull.size()-2], hull.back(), pts[i]) <= 0)
            hull.pop_back();
        hull.push_back(pts[i]);
    }
    hull.pop_back();
    return hull;
}`,
      'convex_hull.cpp',
      'O(n \\log n)',
      'O(n)',
      '叉积判别转向',
      '\\overrightarrow{AB} \\times \\overrightarrow{AC} = (x_B - x_A)(y_C - y_A) - (y_B - y_A)(x_C - x_A)',
      '构建上凸壳时循环退出条件必须检查 hull.size() > lowerSize，不能弹出下凸壳顶点。',
      '4\n4 8\n4 12\n5 9.3\n7 8',
      '12.00'
    ),
  },
  {
    id: 'repo-hld',
    title: '重链剖分（树链剖分 + 线段树）',
    tier: 'ACM',
    category: 'advanced',
    kind: 'variant',
    difficulty: '省选/NOI-',
    stars: 5,
    favorite: false,
    tags: ['树链剖分', 'LCA', '高级数据结构'],
    summary: '两次 DFS 将树上路径查询转化为 O(log n) 段连续 DFS 序区间。',
    updatedAt: Date.now() - 12000000,
    workspace: makeRepoWorkspace(
      'ws-hld',
      '重链剖分标准框架',
      'P3384',
      'ACM / 省选模板',
      '省选/NOI-',
      ['树链剖分', '高级算法'],
      `#include <bits/stdc++.h>
using namespace std;

const int N = 100005;
vector<int> g[N];
int fa[N], dep[N], sz[N], son[N], topf[N], dfn[N], timer = 0;

void dfs1(int u, int p) {
    fa[u] = p; dep[u] = dep[p] + 1; sz[u] = 1;
    for (int v : g[u]) if (v != p) {
        dfs1(v, u);
        sz[u] += sz[v];
        if (sz[v] > sz[son[u]]) son[u] = v;
    }
}

void dfs2(int u, int t) {
    topf[u] = t; dfn[u] = ++timer;
    if (son[u]) dfs2(son[u], t);
    for (int v : g[u]) if (v != fa[u] && v != son[u]) dfs2(v, v);
}`,
      'hld.cpp',
      'O(n + q \\log^2 n)',
      'O(n)',
      '轻重链跳转深度比较',
      '\\text{while } (top[u] \\ne top[v]) \\; \\text{jump deeper } top',
      'dfs2 务必优先递归重儿子 son[u] 以保证同一条重链上节点的 dfn 序连续。',
      '5 5 2 24\n7 3 7 8 0',
      '2'
    ),
  },
];
