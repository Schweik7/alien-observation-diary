import EventCard from './EventCard'
import ReactionCard from './ReactionCard'
import SceneCard from './SceneCard'

// 卡牌分发器：按卡牌类型选择对应版式。
export default function GameCard({ card }) {
  switch (card.type) {
    case '事件卡':
      return <EventCard card={card} />
    case '反应卡':
      return <ReactionCard card={card} />
    case '场景卡':
      return <SceneCard card={card} />
    default:
      return <EventCard card={card} />
  }
}
