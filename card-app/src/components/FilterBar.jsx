// 顶部筛选条：按卡牌类型 / 暴露度过滤。
const TYPES = ['全部', '事件卡', '反应卡', '场景卡']
const EXPOSURES = ['全部', '绿', '黄', '红']
const EXP_DOT = { 绿: '🟢', 黄: '🟡', 红: '🔴' }

export default function FilterBar({
  typeFilter,
  setTypeFilter,
  expFilter,
  setExpFilter,
  counts
}) {
  return (
    <div className="filterbar">
      <div className="filter-group">
        <span className="filter-group__label">卡牌类型</span>
        <div className="chips">
          {TYPES.map((t) => (
            <button
              key={t}
              className={`chip ${typeFilter === t ? 'chip--active' : ''}`}
              onClick={() => setTypeFilter(t)}
            >
              {t}
              {t !== '全部' && counts.byType[t] != null && (
                <span className="chip__count">{counts.byType[t]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <span className="filter-group__label">暴露度</span>
        <div className="chips">
          {EXPOSURES.map((e) => (
            <button
              key={e}
              className={`chip chip--exp chip--exp-${e} ${
                expFilter === e ? 'chip--active' : ''
              }`}
              onClick={() => setExpFilter(e)}
            >
              {e === '全部' ? '全部' : `${EXP_DOT[e]} ${e}`}
              {e !== '全部' && counts.byExp[e] != null && (
                <span className="chip__count">{counts.byExp[e]}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
