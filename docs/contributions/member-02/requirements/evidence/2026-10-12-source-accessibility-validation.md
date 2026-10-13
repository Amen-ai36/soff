# 候选数据源许可、字段与可访问性验证

> 验证人：成员 2
> 验证时间：2026-10-12 17:06 CST
> 网络环境：本机网络；自动请求不以 HTTP 200 作为唯一成功条件
> 相关调研：`docs/contributions/member-02/research/需求调研-数据源与合规分析（成员2-成员7修订版）.md`

## 1. 结论摘要

| 来源 | 当前可访问性 | 字段可用性 | 许可结论 | 建议级别 |
| --- | --- | --- | --- | --- |
| OpenAlex | API 返回 200 JSON | 论文、作者、机构、主题字段完整 | 元数据 CC0 | P0 论文主源 |
| DBLP | API 返回 200 但为 HTML 挑战页 | 无法从本次自动响应获得 JSON 字段 | 元数据 CC0，官方允许低频爬取 | P0 补充源，使用批量快照或人工可访问环境 |
| NSF | Award API 返回 200 JSON | Award、PI、机构、金额、日期字段完整 | 官方公开数据 | P0 项目主源 |
| CORDIS | 项目页和法务页返回 200 HTML | 项目字段可用，DET API 需注册 key | 欧盟编辑内容通常 CC BY 4.0；受益方材料另判 | P0 项目主源，自动增量待 key |
| EPO OPS | 未带 OAuth 请求返回 403 XML | 需注册后核验具体接口字段 | 可用于自有数据库和产品，不得原样再分发 | P1 专利候选 |
| USPTO ODP | 门户和 API 目录返回 200 HTML | 官方批量数据/ODP 可用 | 美国官方数据；第三方内容例外 | P1 专利补充 |
| NSFC | 公开门户和政策页返回 200 | 页面为应用壳或受限查询；无通用开放 API 证据 | 未发现批量再利用许可 | P2，人工/书面授权 |
| MOST/NOSTA | 正式获奖专题和奖励办页面返回 200 | 可人工提取获奖事实字段 | 官方公告可引用；版式、图片和第三方材料另判 | P0 获奖主源，人工提取 |

## 2. 实际请求记录

### 2.1 OpenAlex

请求：

```text
GET https://api.openalex.org/works
    ?search=graph neural network
    &per-page=1
    &select=id,doi,title,publication_year,authorships,primary_topic
```

结果：

- HTTP 200，JSON。
- `meta.count=988681`。
- 样本 ID：`https://openalex.org/W4392553889`。
- 观察到 `doi`、`title`、`publication_year`、`authorships`、机构、ORCID、ROR 和 `primary_topic`。

判断：适合论文主链路；摘要、PDF 和全文许可仍需字段级判断。

### 2.2 DBLP

请求：

```text
GET https://dblp.org/search/publ/api?q=graph&format=json&h=1
```

结果：

- HTTP 200。
- `Content-Type=text/html; charset=utf-8`。
- 响应大小 7441 字节，不是 JSON 业务结果。

判断：这是典型的“状态码成功但来源契约失败”样本。采集器必须校验内容类型和结构，不能将 HTML 挑战页解析为空结果或成功记录。未尝试绕过验证。正式实现优先使用可获得的 DBLP 冻结快照；无法访问自动页面时由成员 7 在人工可访问环境补充证据。

### 2.3 NSF

请求：

```text
GET https://api.nsf.gov/services/v1/awards.json
    ?keyword=graph
    &printFields=id,title,awardeeName,startDate,expirationDate,fundsObligatedAmt
    &offset=1&rpp=1
```

结果：

- HTTP 200，JSON。
- `metadata.totalCount=5108`。
- 样本字段包括 Award ID、题名、awardee、start/expiration date、obligated amount、PI 和项目代码。

判断：API 可访问，字段满足项目表；正式采集需要按关键词和日期分页，不使用无界查询。

### 2.4 CORDIS

请求：

```text
GET https://cordis.europa.eu/projects
GET https://cordis.europa.eu/about/legal
GET https://cordis.europa.eu/about/dataextractions-api
```

结果：三项均 HTTP 200 HTML。法务页说明欧盟自有编辑内容通常适用 CC BY 4.0，受益方材料另受资助协议和单独权利约束；DET API 文档说明 API Key 和动态限额。

判断：网页访问和许可路径可用；DET API 的授权接入要求已确认，正式实现必须使用注册 API Key 并遵守平台动态限额。本次 HTML 访问不作为 DET API 已连通的证明。

### 2.5 EPO OPS

请求：

```text
GET https://ops.epo.org/3.2/rest-services/published-data/publication/epodoc/EP1000000/biblio
```

结果：HTTP 403，`application/xml`。这符合未完成 OAuth 2.0 认证的预期。

判断：需要注册 OAuth 客户端后才能验证字段和配额。来源职责和 4 GB/周等条款继续引用现有成员 2、7 调研稿和 EPO 官方页面。未使用个人凭证，也未绕过认证。

### 2.6 USPTO

请求：

```text
GET https://data.uspto.gov/
GET https://developer.uspto.gov/api-catalog
```

结果：均 HTTP 200 HTML。

判断：官方入口可访问；批量数据产品应在正式实现 SPEC 中单独列出，不从检索页面抓取。

### 2.7 NSFC 与获奖来源

| 来源 | 请求 | 结果 | 判断 |
| --- | --- | --- | --- |
| NSFC 门户 | `GET https://kd.nsfc.cn/` | 200，text/html，约 1 KB | 页面可访问，但这不是批量数据或开放 API 证明 |
| NSFC 政策 | `GET https://kd.nsfc.cn/statement` | 200，text/html，约 1 KB | 只证明政策页路径可达 |
| NOSTA | `GET https://www.nosta.gov.cn/` | 200，HTML | 获奖来源可达，结构需人工解析 |
| MOST 2025 奖励专题 | `GET https://www.most.gov.cn/ztzl/gjkxjsjldh/jldh2025/index.html` | 200，HTML，约 42 KB | 适合人工核验获奖事实 |

NSFC 批量再利用仍为待授权；正式链路不能在未取得书面许可时依赖隐藏接口、登录数据或验证码。

## 3. 字段映射验证

| canonical 字段 | OpenAlex | DBLP | NSF | CORDIS | 获奖公告 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| 统一 ID | Work ID | DBLP Key | Award ID | Project ID | 公告/奖项编号 | 来源 ID 必须保留 |
| 题名/名称 | display_name | title | title | title/acronym | 项目名称 | 均需原文和规范化版本 |
| DOI/外部 ID | DOI | DOI/Key | Award ID | Project ID | 公告编号 | 不做跨类型转换 |
| 作者/负责人 | authorships | authors | PI/co-PI | coordinator/participants | 完成人 | 分离作者和机构对象 |
| 机构 | institutions/ROR | 无统一机构 | awardee/机构 | participants | 完成单位 | 机构需归一化 |
| 日期 | publication date | year | start/expiration | start/end | 年度 | 缺失和未知分开 |
| 分类/领域 | topics | venue/stream | program | topics/keywords | 奖项类别 | 平台映射需版本化 |
| 金额 | 不适用 | 不适用 | obligated amount | total/EU contribution | 不适用 | 保留币种 |
| 摘要 | abstract 可选 | 无 | abstractText | objective | 通常无 | 受字段级许可约束 |

## 4. 许可和访问边界

1. OpenAlex 元数据 CC0；PDF/TEI 不随元数据进入公共领域。
2. DBLP 元数据 CC0，但当前自动响应为挑战页；不得通过规避手段获取。
3. EPO OPS 可用于数据库和产品，但不得把来源数据本身原样公开或转售。
4. CORDIS 欧盟编辑内容通常 CC BY 4.0，项目方材料另判。
5. NSF 官方数据可按公开数据使用，但须保留来源和 Award ID。
6. NSFC、CNIPA 和需要登录或验证码的页面不作为未授权自动链路。
7. 获奖来源只提取事实字段，不复制图片、版式和证书扫描件。

## 5. 验证局限

- 本次未使用 EPO OAuth、CORDIS DET API Key 或 NSFC 书面授权。
- DBLP 本次只记录自动访问失败，没有把浏览器人工访问结果冒充为 API 成功。
- HTTP 200 的 HTML 页面可能包含动态内容和访问控制，不能仅凭大小判断完整性。
- 网络环境、地区、供应商条款和接口行为可能变化；正式采集前应重新核验并保存条款快照。
- 本文件不替代正式法律意见。
