import { useState, useRef, useEffect } from 'react'
import '../../index.css'

export default function SwipeCard({ card, active }) {
    const [likes, updateLikes] = useState(card.likeCount)
    const [liked, setLiked] = useState(false)
    const [videoReady, setVideoReady] = useState(false)
    const videoRef = useRef(null)

    useEffect(() => {
        if (active) {
            videoRef.current?.play().catch(() => {})
        } else {
            videoRef.current?.pause()
        }
    }, [active])

    function handleLike() {
        if (!liked) {
            fetch(`https://00bws6efnk.execute-api.us-east-2.amazonaws.com/prod/like?placeId=${card.placeId}`, {
                method: 'POST'
            })
            updateLikes(likes + 1)
            setLiked(true)
        }
    }

    return (
        <div className="swipe-card">
            {!videoReady && <div className="video-loading"><div className="spinner"></div></div>}
            <video
                ref={videoRef}
                src={card.video}
                loop
                muted
                playsInline
                preload="auto"
                onCanPlay={() => setVideoReady(true)}
            />
            <div className="card-overlay">
                <h2>{card.name}</h2>
                <button onClick={handleLike}>{liked ? '❤️' : '🤍'} {likes}</button>
                <button>📋 Menu</button>
            </div>
        </div>
    )
}
