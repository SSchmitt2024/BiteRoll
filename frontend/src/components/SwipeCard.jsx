import { useRef, useEffect } from 'react'
import '../../index.css'

export default function SwipeCard({ card, active, liked, likeCount, onToggleLike }) {
    const videoRef = useRef(null)

    useEffect(() => {
        if (active) {
            videoRef.current?.play().catch(() => {})
        } else {
            videoRef.current?.pause()
        }
    }, [active])

    function handleLike() {
        onToggleLike(card.placeId, !liked)
    }

    return (
        <div className="swipe-card">
            <video
                ref={videoRef}
                src={card.video}
                loop
                muted
                playsInline
                preload="auto"
            />
            <div className="card-overlay">
                <h2>{card.name}</h2>
                <button onClick={handleLike}>{liked ? '❤️' : '🤍'} {likeCount}</button>
                <button>📋 Menu</button>
            </div>
        </div>
    )
}
