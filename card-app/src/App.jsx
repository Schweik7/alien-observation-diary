import { useEffect, useMemo, useState } from 'react'
import { sampleCards } from './data/sampleCards'
import { loadCards } from './data/parseCsv'
import GameCard from './components/GameCard'
import FilterBar from './components/FilterBar'

// 完整 120 张 CSV 接入点：把 CSV 拷到 public/ 目录，并把文件名填进这里。
// 详见 README。加载失败时自动回退到内置示例卡，应用始终能跑。
const CSV_URL = `${import.meta.env.BASE_URL}cards.csv`

export default function App() {
  const [cards, setCards] = useState(sampleCards)
  const [source, setSource] = useState('sample')
  const [typeFilter, setTypeFilter] = useState('全部')
  const [expFilter, setExpFilter] = useState('全部')

  useEffect(() => {
    let alive = true
    loadCards(CSV_URL, sampleCards).then((res) => {
      if (!alive) return
      setCards(res.cards)
      setSource(res.source)
    })
    return () => {
      alive = false
    }
  }, [])

  const counts = useMemo(() => {
    const byType = {}
    const byExp = {}
    for (const c of cards) {
      byType[c.type] = (byType[c.type] || 0) + 1
      byExp[c.exposure] = (byExp[c.exposure] || 0) + 1
    }
    return { byType, byExp }
  }, [cards])

  const filtered = useMemo(() => {
    return cards.filter((c) => {
      if (typeFilter !== '全部' && c.type !== typeFilter) return false
      if (expFilter !== '全部' && c.exposure !== expFilter) return false
      return true
    })
  }, [cards, typeFilter, expFilter])

  return (
    <div className="app">
      <header className="hero">
        <div className="hero__grid" aria-hidden />
        <div className="hero__inner">
          <div className="hero__eyebrow">EARTHLING OBSERVATION ARCHIVE · 外星观测档案</div>
          <h1 className="hero__title">地球人观察日记</h1>
          <p className="hero__subtitle">
            三国杀风格卡牌画廊 · 事件卡 / 反应卡 / 场景卡
          </p>
          <div className="hero__meta">
            <span className="hero__pill">共 {cards.length} 张</span>
            <span className={`hero__pill hero__pill--${source}`}>
              {source === 'csv' ? '数据源：外部 CSV' : '数据源：内置示例（未检测到 CSV）'}
            </span>
          </div>
        </div>
      </header>

      <FilterBar
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        expFilter={expFilter}
        setExpFilter={setExpFilter}
        counts={counts}
      />

      <main className="gallery-wrap">
        {filtered.length === 0 ? (
          <p className="empty">没有符合当前筛选的卡牌。</p>
        ) : (
          <div className="gallery">
            {filtered.map((c) => (
              <GameCard key={c.id} card={c} />
            ))}
          </div>
        )}
      </main>

      <footer className="foot">
        《地球人观察日记》观测档案 · 配图区为 art prompt 占位，待美术接入
      </footer>
    </div>
  )
}
