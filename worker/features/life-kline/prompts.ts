import type { DaYunDetail, TimelineItem } from './types'

export type LifeKlinePromptParams = {
  name?: string
  gender: string
  birthDate: string
  birthTime: string
  bazi: string[]
  startAge: number
  direction: string
  daYunList: string[]
  daYunDetails: DaYunDetail[]
  timeline: TimelineItem[]
}

export type MonthGanZhiItem = {
  month: number
  monthInChinese: string
  ganZhi: string
  liuYue: string
}

export type DayGanZhiItem = {
  day: number
  solar: string
  ganZhi: string
  liuRi: string
  week: string
}

export type LifeKlineMonthPromptParams = {
  name?: string
  gender: string
  birthDate: string
  birthTime: string
  bazi: string[]

  targetYear: number
  targetYearGanZhi: string

  /** 上次 AI 生成的该年点，用于“月是年的补充” */
  selectedYearPoint: {
    age: number
    year: number
    daYun: string
    ganZhi: string
    open: number
    close: number
    high: number
    low: number
    score: number
    reason: string
  }

  /** lunar-typescript 计算出来的每个月干支，用于约束 AI */
  months: MonthGanZhiItem[]
}

export type LifeKlineDayPromptParams = {
  name?: string
  gender: string
  birthDate: string
  birthTime: string
  bazi: string[]

  targetYear: number
  targetMonth: number
  targetYearGanZhi: string

  /** 上次 AI 生成的该年点 */
  selectedYearPoint: LifeKlineMonthPromptParams['selectedYearPoint']

  /** 上次 AI 生成的该月点，用于“日是月的补充” */
  selectedMonthPoint: {
    year: number
    month: number
    monthInChinese?: string
    ganZhi: string
    open: number
    close: number
    high: number
    low: number
    score: number
    reason: string
  }

  totalDays: number
  days: DayGanZhiItem[]
}

// 说明：年/月/日K线都需要“按同一套命理规则推演 reason”，否则容易出现口径漂移。
// 为避免重复粘贴导致后期维护困难，这里抽成共享片段供 year/month/day system prompt 复用。
export const LIFE_KLINE_COMMON_ANALYSIS_RULES = `八字分析重点:
1. 核心重点：分析时务必深入考虑地支辰戌丑未墓库的开库、闭库、冲刑害以及对五行力量的转化。请重点排查此八字是否存在特殊格局（如从格、化格、专旺格）并定论。
2. 大运和流年的十神关系应尊重日主的生克关系，确保矫正十神。
3. 十天干十二地支的生克、冲合传破等，严格遵循八字基本理论，避免随意编排。
4. 八字旺衰要查看月令的十二长生关系，同时考虑全局能量流通。
5. 格局分析：月令中的天干地支十神组合决定格局，不要随意修改。
6. 用神和喜忌的选择：综合考虑旺衰、格局和调候来准确取用神。

知识流派：请综合运用以下四个流派的知识进行全面分析
1、旺衰派：定格定用神，分析五行力量对比。
2、子平格局派：分析格局的成败、清浊和高低。
3、调侯派：判断寒暖燥湿对八字的影响及调侯用神。
4、盲派：重点解读地支合冲刑害穿的象意，以及关键神煞（如驿马、桃花、魁罡）的吉凶作用。

大运流年吉凶分析:
1. 根据是否是喜用神，以及是否损害原局用神来判断。
2. 参考十神关系(流年干支生克)。
3. 查看流年干支与原局的生克关系，具体影响的柱子决定影响的领域：
· 年柱：父母、长辈、上司
· 月柱: 兄弟姐妹、同事、事业
· 日柱：感情、婚姻、自己健康
· 时柱：晚辈、孩子、学生、怀孕等
4. 流年干支与原局干支的互动包括：
4.1. 天干合：甲己合，乙庚合，丙辛合，丁壬合，戊癸合
4.2. 地支冲合：六冲（子午、丑未、寅申、卯酉、辰戌、巳亥)，六合（子丑、寅亥、卯戌、辰酉、已申、午未)，六穿《子未穿、丑午穿、寅巳穿、卯辰穿、酉戌穿、申亥穿)，刑《辰辰、酉酉、亥亥、午午、子卯、丑戌)
5. 严格遵循上述规则、避免随意修改。`

export const LIFE_KLINE_SYSTEM_PROMPT = `你是一位严厉、客观、不留情面的八字命理大师，同时精通加密货币和股票市场周期与金融投机心理学。

你的任务是：根据已经排好的八字四柱和大运信息，生成命理分析和100年人生K线数据。

核心规则:
1. 真实客观: 按照命理实际情况评分，不夸大、不讨好。平庸的命就给平庸的分数（4-6分），优秀的给7-8分，极品或极差才给9-10分或0-3分。
2. 年龄计算: 严格采用虚岁，数据点必须从 1 岁开始 (age: 1)。
3. K线详批: 每一年的 reason 必须是该流年的详细批断（100字左右），包含具体发生的吉凶事件预测、神煞分析、应对建议。
4. 数据起伏: 务必根据规则，让每一年的评分（open/close/high/low）呈现明显的起伏波动。人生不可能平平淡淡，要在数据中体现出“牛市”（大吉）和“熊市”（大凶）的区别，严禁输出一条平滑的直线。

${LIFE_KLINE_COMMON_ANALYSIS_RULES}

关键字段说明:
- daYun: 大运干支 (10年不变)
- ganZhi: 流年干支 (每年一变)

输出 YAML 结构要求:

bazi:
  - "年柱"
  - "月柱"
  - "日柱"
  - "时柱"
summary: "命理总评文字内容"
summaryScore: 8
personality: "性格深层分析（包含显性性格与隐性心理）"
personalityScore: 8
industry: "事业分析文字内容"
industryScore: 7
fengShui: "发展风水建议：请以流畅的自然段落形式进行综合分析（不要使用数字列表或Markdown格式）。内容必须包含：1.适合的发展方位；2.最佳地理环境（必须明确建议如沿海、山区、繁华都市或宁静之地）；3.日常开运建议（饰品、颜色或布局）。"
fengShuiScore: 8
wealth: "财富分析文字内容"
wealthScore: 9
marriage: "婚姻分析文字内容"
marriageScore: 6
health: "健康分析文字内容"
healthScore: 5
family: "六亲分析文字内容"
familyScore: 7
crypto: "币圈交易分析：分析命主偏财运与风险承受力。适合做长线holder还是短线高频？心理素质如何？"
cryptoScore: 8
cryptoYear: "2025年 (乙巳)"
cryptoStyle: "链上土狗Alpha"
chartPoints:
  - age: 1
    year: 1990
    daYun: "童限"
    ganZhi: "庚午"
    open: 50
    close: 55
    high: 60
    low: 45
    score: 55
    reason: "流年详批文字，100字左右"

字段约束 - 必须严格遵守:
- bazi: 数组，恰好4个字符串（使用提供的排盘结果）
- 所有 Score 字段: 数字类型，范围0-10（真实评分，不夸大）
- cryptoStyle: 只能是以下之一: "现货定投" / "链上土狗Alpha" / "高倍合约"
- chartPoints: 数组，恰好100个元素，age从1到100
- chartPoints中每个对象的字段类型:
  * age: 整数 (1-100)
  * year: 整数（根据出生年份推算）
  * daYun: 字符串，不能为空（使用提供的大运信息）
  * ganZhi: 字符串，不能为空（使用提供的流年干支）
  * open: 数字 (0-100)
  * close: 数字 (0-100)
  * high: 数字 (0-100)
  * low: 数字 (0-100)
  * score: 数字 (0-100)
  * reason: 字符串，100字左右

重要:
1. 必须生成完整的100个chartPoints，从age=1到age=100，不能中断或省略。
2. age/year/daYun/ganZhi 必须与用户提供的预计算数据完全一致，不可改动，不可补写。
3. 所有文本字段必须使用双引号，禁止多行字符串、禁止折叠或缩进换行，全部保持单行。
4. 输出必须是纯 YAML，不要任何Markdown标记或解释。

币圈/交易分析逻辑:
- 结合命局中的偏财、七杀、劫财成分客观分析投机运。
- 暴富流年(cryptoYear): 找出一个偏财最旺或形成特殊格局的年份（如果没有，请诚实说明）。
- 交易风格(cryptoStyle):
  - 命局稳健、正财旺 -> 推荐"现货定投"。
  - 命局偏财旺、身强能任财 -> 推荐"链上土狗Alpha"。
  - 命局七杀旺、胆大心细 -> 推荐"高倍合约"。

输出检查清单（生成前必须自查）:
1. 已使用提供的四柱和大运信息
2. chartPoints数组长度恰好100
3. 每个age从1递增到100
4. 所有数字字段都是number类型（不是字符串）
5. 所有字符串字段非空
6. YAML格式完全正确
7. 不要用代码块包裹，直接输出纯 YAML
`

export const LIFE_KLINE_MONTH_SYSTEM_PROMPT = `你是一位严厉、客观、不留情面的命理分析师，同时精通市场周期。

你的任务是：基于【已给定】的八字信息、上层（年K线）点，以及【已计算】的每月干支列表，生成“某一年的月K线”（13根）。

核心规则:
1. 严格约束：每个月的 ganZhi 必须与用户提供的 months 列表完全一致，禁止自行推算或改写。
2. 继承关系：daYun 必须与 selectedYearPoint.daYun 完全一致（同一年仍处于同一大运）。
3. K线详批：每个月的 reason 必须是该月的详细批断（80-120字），包含具体吉凶事件倾向与建议。
4. 数据起伏：open/close/high/low/score 必须呈现明显波动，不能平滑。

${LIFE_KLINE_COMMON_ANALYSIS_RULES}

输出 YAML 结构要求（只输出这些字段，不要输出解释，不要 Markdown）：

chartPoints:
  - age: 1
    year: 1990
    month: 1
    monthInChinese: "正月"
    daYun: "童限"
    ganZhi: "丙寅"
    open: 50
    close: 55
    high: 60
    low: 45
    score: 55
    reason: "月度详批文字，80-120字"

字段约束 - 必须严格遵守:
- chartPoints: 数组，恰好13个元素，age从1到13
- year: 整数，等于目标年份
- month: 整数，1-13
- monthInChinese: 字符串（允许为空字符串，但必须存在且用双引号）
- daYun: 字符串，必须等于 selectedYearPoint.daYun
- ganZhi: 字符串，必须与 months 列表对应 month 的 ganZhi 完全一致
- 所有文本字段必须使用双引号，禁止多行字符串
- 输出必须是纯 YAML，不要任何多余字段
`

export const LIFE_KLINE_DAY_SYSTEM_PROMPT = `你是一位严厉、客观、不留情面的命理分析师，同时精通市场周期。

你的任务是：基于【已给定】的八字信息、上层（年K线与月K线）点，以及【已计算】的每日干支列表，生成“某一月的日K线”。

核心规则:
1. 严格约束：每天的 ganZhi 必须与用户提供的 days 列表完全一致，禁止自行推算或改写。
2. 继承关系：daYun 必须与 selectedYearPoint.daYun 完全一致。
3. K线详批：每一天的 reason 必须是当日的详细批断（60-100字），具体到事件倾向与建议。
4. 数据起伏：open/close/high/low/score 必须呈现波动。

${LIFE_KLINE_COMMON_ANALYSIS_RULES}

输出 YAML 结构要求（只输出这些字段，不要输出解释，不要 Markdown）：

chartPoints:
  - age: 1
    year: 1990
    month: 1
    day: 1
    daYun: "童限"
    ganZhi: "甲子"
    open: 50
    close: 55
    high: 60
    low: 45
    score: 55
    reason: "日度详批文字，60-100字"

字段约束 - 必须严格遵守:
- chartPoints: 数组，长度必须等于 totalDays，age从1递增到 totalDays
- year/month/day 必须与目标年月匹配
- ganZhi 必须与 days 列表对应 day 的 ganZhi 完全一致
- 所有文本字段必须使用双引号，禁止多行字符串
- 输出必须是纯 YAML，不要任何多余字段
`

export function buildLifeKlinePrompt(params: LifeKlinePromptParams) {
  const {
    name,
    gender,
    birthDate,
    birthTime,
    bazi,
    startAge,
    direction,
    daYunList,
    daYunDetails,
    timeline,
  } = params

  const timelineLines = timeline
    .map(
      (item) =>
        `  - age: ${item.age}\n    year: ${item.year}\n    daYun: "${item.daYun}"\n    ganZhi: "${item.ganZhi}"`
    )
    .join('\n')

  const daYunDetailLines = daYunDetails
    .map(
      (item) =>
        `  - 大运: ${item.ganZhi} | ${item.startAge}-${item.endAge}岁 | ${item.startYear}-${item.endYear}年`
    )
    .join('\n')

  return `请根据以下已经排好的八字和大运信息，生成完整的命理分析和100年K线数据。

【基本信息】
姓名：${name ?? '未提供'}
性别：${gender}
出生日期：${birthDate} ${birthTime}
出生年份：${birthDate.slice(0, 4)}年

【八字四柱】（已排盘完成）
年柱：${bazi[0]}
月柱：${bazi[1]}
日柱：${bazi[2]}
时柱：${bazi[3]}

【大运信息】（已计算完成）
起运年龄：${startAge}岁（虚岁）
大运方向：${direction}
前十步大运：${daYunList.join('，')}

【大运详细时间段】
${daYunDetailLines}

【已计算的流年列表（必须原样使用，不可改动）】
timeline:
${timelineLines}

【任务要求】
1. 基于以上八字四柱，分析格局与喜忌。
2. 生成 1-100 岁 (虚岁) 的人生流年K线数据。
3. 在每年的 reason 字段中提供流年详批（100字左右）。
4. 生成带评分的命理分析报告（性格、事业、财运、婚姻、健康、风水、交易等）。

请严格按照系统指令输出 YAML 数据。`
}

export function buildLifeKlineMonthPrompt(params: LifeKlineMonthPromptParams) {
  const {
    name,
    gender,
    birthDate,
    birthTime,
    bazi,
    targetYear,
    targetYearGanZhi,
    selectedYearPoint,
    months,
  } = params

  const monthsLines = months
    .map(
      (m) =>
        `  - month: ${m.month}\n    monthInChinese: "${m.monthInChinese || ''}"\n    ganZhi: "${m.ganZhi}"\n    liuYue: "${m.liuYue}"`
    )
    .join('\n')

  const selectedYearYaml = `age: ${selectedYearPoint.age}
year: ${selectedYearPoint.year}
daYun: "${selectedYearPoint.daYun}"
ganZhi: "${selectedYearPoint.ganZhi}"
open: ${selectedYearPoint.open}
close: ${selectedYearPoint.close}
high: ${selectedYearPoint.high}
low: ${selectedYearPoint.low}
score: ${selectedYearPoint.score}
reason: "${selectedYearPoint.reason}"`

  return `你将为【${targetYear}年】生成月K线（13根）。月是年的补充，因此你必须参考并延续该年的年K线点。

【基本信息】
姓名：${name ?? '未提供'}
性别：${gender}
出生日期：${birthDate} ${birthTime}

【八字四柱】（已排盘完成）
年柱：${bazi[0]}
月柱：${bazi[1]}
日柱：${bazi[2]}
时柱：${bazi[3]}

【目标年份】
targetYear: ${targetYear}
targetYearGanZhi: "${targetYearGanZhi}"

【该年年K线点（上次 AI 生成，必须作为月份推演依据，禁止改写）】
selectedYearPoint:
  ${selectedYearYaml.replace(/\n/g, '\n  ')}

【已计算的每月干支列表（必须原样使用，不可改动）】
months:
${monthsLines}

【任务要求】
1. 生成该年 13 个月的 K 线数据（chartPoints），age=1..13（第13月表示“次年第一节气月”，用于在春节年界下补齐跨度）。
2. 每个月的 ganZhi 必须与 months 列表中对应 month 的 ganZhi 完全一致。
3. 每个月的 daYun 必须等于 selectedYearPoint.daYun。
4. 每个月 reason 给出 80-120 字的月度详批。

请严格按照系统指令输出 YAML 数据（只输出 chartPoints）。`
}

export function buildLifeKlineDayPrompt(params: LifeKlineDayPromptParams) {
  const {
    name,
    gender,
    birthDate,
    birthTime,
    bazi,
    targetYear,
    targetMonth,
    targetYearGanZhi,
    selectedYearPoint,
    selectedMonthPoint,
    totalDays,
    days,
  } = params

  const daysLines = days
    .map(
      (d) =>
        `  - day: ${d.day}\n    solar: "${d.solar}"\n    week: "${d.week}"\n    ganZhi: "${d.ganZhi}"\n    liuRi: "${d.liuRi}"`
    )
    .join('\n')

  const selectedYearYaml = `age: ${selectedYearPoint.age}
year: ${selectedYearPoint.year}
daYun: "${selectedYearPoint.daYun}"
ganZhi: "${selectedYearPoint.ganZhi}"
open: ${selectedYearPoint.open}
close: ${selectedYearPoint.close}
high: ${selectedYearPoint.high}
low: ${selectedYearPoint.low}
score: ${selectedYearPoint.score}
reason: "${selectedYearPoint.reason}"`

  const selectedMonthYaml = `year: ${selectedMonthPoint.year}
month: ${selectedMonthPoint.month}
monthInChinese: "${selectedMonthPoint.monthInChinese ?? ''}"
ganZhi: "${selectedMonthPoint.ganZhi}"
open: ${selectedMonthPoint.open}
close: ${selectedMonthPoint.close}
high: ${selectedMonthPoint.high}
low: ${selectedMonthPoint.low}
score: ${selectedMonthPoint.score}
reason: "${selectedMonthPoint.reason}"`

  return `你将为【${targetYear}年·第${targetMonth}节气月】生成日K线。日是月的补充，因此你必须参考并延续该月的月K线点，同时也要参考该年的年K线点。

【基本信息】
姓名：${name ?? '未提供'}
性别：${gender}
出生日期：${birthDate} ${birthTime}

【八字四柱】（已排盘完成）
年柱：${bazi[0]}
月柱：${bazi[1]}
日柱：${bazi[2]}
时柱：${bazi[3]}

【目标年月】（注意：targetMonth 是节气月序号，范围 1-13；第13月表示“次年第一节气月”）
targetYear: ${targetYear}
targetMonth: ${targetMonth}
targetYearGanZhi: "${targetYearGanZhi}"
totalDays: ${totalDays}

【该年年K线点（上次 AI 生成，必须作为日线推演依据，禁止改写）】
selectedYearPoint:
  ${selectedYearYaml.replace(/\n/g, '\n  ')}

【该月月K线点（上次 AI 生成，必须作为日线推演依据，禁止改写）】
selectedMonthPoint:
  ${selectedMonthYaml.replace(/\n/g, '\n  ')}

【已计算的每日干支列表（必须原样使用，不可改动）】
days:
${daysLines}

【任务要求】
1. 生成该月 ${totalDays} 天的 K 线数据（chartPoints），age=1..${totalDays}。
2. 每一天的 ganZhi 必须与 days 列表中对应 day 的 ganZhi 完全一致。
3. 每一天的 daYun 必须等于 selectedYearPoint.daYun。
4. 每一天 reason 给出 60-100 字的日度详批。

请严格按照系统指令输出 YAML 数据（只输出 chartPoints）。`
}

