// 成就图鉴：可作为弹窗（modal）展示全部成就，或在结算页展示已达成的成就。
// catalog: 服务端下发的完整成就定义 [{key,cat,emoji,name,desc,team}]
// earned: 本局达成情况 [{key, holders:[昵称]}]（可选）

const CAT_ORDER = ['心意相通', '真心话', '角色互动', '破冰暴露']

export function AchievementList({ catalog = [], earned = [] }) {
  const earnedMap = {}
  for (const e of earned) earnedMap[e.key] = e.holders
  const byCat = {}
  for (const a of catalog) (byCat[a.cat] = byCat[a.cat] || []).push(a)
  const cats = [...new Set([...CAT_ORDER, ...Object.keys(byCat)])].filter((c) => byCat[c])

  return (
    <div className="ach">
      {cats.map((cat) => (
        <div key={cat} className="ach__group">
          <div className="ach__cat">{cat}</div>
          <div className="ach__grid">
            {byCat[cat].map((a) => {
              const holders = earnedMap[a.key]
              const unlocked = !!holders
              return (
                <div key={a.key} className={`achcard ${unlocked ? 'achcard--on' : 'achcard--off'}`}>
                  <div className="achcard__emoji">{a.emoji}</div>
                  <div className="achcard__body">
                    <div className="achcard__name">
                      {a.name}
                      {a.team && <span className="achcard__team">团队</span>}
                    </div>
                    <div className="achcard__desc">{a.desc}</div>
                    {unlocked && (
                      <div className="achcard__holders">🏆 {holders.join('、')}</div>
                    )}
                  </div>
                  {!unlocked && <div className="achcard__lock">🔒</div>}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AchievementsModal({ catalog, earned, onClose }) {
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__box" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <span className="modal__title">🏅 成就图鉴</span>
          <button className="btn btn--ghost btn--sm" onClick={onClose}>
            关闭
          </button>
        </div>
        <p className="modal__hint">完成观测任务即可点亮成就。下面是全部可解锁的成就：</p>
        <AchievementList catalog={catalog} earned={earned} />
      </div>
    </div>
  )
}
