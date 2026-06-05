// 系统预设的外星观察员代号 —— 有趣、好记、带点观测档案的中二感。
// 夫妻版需要区分性别：男性一栏、女性一栏。
export const NICKNAMES_MALE = [
  '触手博士', '银河会计', '火星房东', '观测员7号', '冷静的章鱼', '隔壁飞碟',
  '碳基生物研究员', '可疑的扫地僧', '宇宙级嘴硬', '硬核浪漫派', '社恐侦察兵',
  '低电量战士', '没带充电器的AI', '逻辑过载', '佛系观察员', '装睡的探测器',
  '附近的飞行器', '匿名小绿人', '深夜信号塔', '打瞌睡的雷达', '潜伏的奶酪',
  '迷路的彗星', '失重的奶茶', '外勤特派员'
]

export const NICKNAMES_FEMALE = [
  '反重力小熊', '量子柴犬', '第三只眼', '薛定谔的猫粮', '会脸红的机器人',
  '光速蜗牛', '情绪光谱仪', '毛茸茸观测组', '反差萌探测器', '星尘收集者',
  '会做梦的导航仪', '温柔的暴风眼', '柔软的陨石', '会撒娇的黑洞', '盲盒级心情',
  '隐形的拥抱', '碎碎念卫星', '高敏星球', '理性与眼泪', '泡面星人',
  '不眠卫星', '土豆飞船', '黑洞早餐', '人类行为爱好者'
]

// 兼容旧引用
export const NICKNAMES = [...NICKNAMES_MALE, ...NICKNAMES_FEMALE]

export function randomNickname(gender) {
  const list = gender === 'female' ? NICKNAMES_FEMALE : gender === 'male' ? NICKNAMES_MALE : NICKNAMES
  return list[Math.floor(Math.random() * list.length)]
}
