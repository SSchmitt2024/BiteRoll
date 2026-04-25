import { useRef, useEffect } from 'react'
import '../../index.css'

export default function SwipeCard({ card, active }) {
    const [likes, updateLikes] = useState(card.likeCount)
    const [liked, setLiked] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    const [menuUrl, setMenuUrl] = useState(null)
    const [menuLoading, setMenuLoading] = useState(false)
    const [menuError, setMenuError] = useState(false)
export default function SwipeCard({ card, active, liked, likeCount, onToggleLike }) {
    const videoRef = useRef(null)

    useEffect(() => {
        if (active && !menuOpen) {
            videoRef.current?.play().catch(() => {})
        } else {
            videoRef.current?.pause()
        }
    }, [active, menuOpen])

    function handleLike() {
        onToggleLike(card.placeId, !liked)
    }

    function handleOpenMenu() {
        setMenuOpen(true)
        if (menuUrl || menuLoading) return
        setMenuLoading(true)
        setMenuError(false)
        fetch(`https://00bws6efnk.execute-api.us-east-2.amazonaws.com/prod/menu?placeId=${card.placeId}`)
            .then(response => {
                if (!response.ok) throw new Error('menu unavailable')
                return response.json()
            })
            .then(data => setMenuUrl(data.menuURL))
            .catch(() => setMenuError(true))
            .finally(() => setMenuLoading(false))
    }

    function handleCloseMenu() {
        setMenuOpen(false)
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
                <button onClick={handleLike}>{liked ? '❤️' : '🤍'} {likes}</button>
                <button onClick={handleOpenMenu}>📋 Menu</button>
                <button onClick={handleLike}>{liked ? '❤️' : '🤍'} {likeCount}</button>
                <button>📋 Menu</button>
            </div>
            {menuOpen && (
                <div className="menu-overlay" onPointerDown={e => e.stopPropagation()}>
                    <button className="menu-close" onClick={handleCloseMenu} aria-label="Close menu">✕</button>
                    {menuLoading && (
                        <div className="menu-status">
                            <div className="spinner"></div>
                            <p>Loading menu...</p>
                        </div>
                    )}
                    {menuError && (
                        <div className="menu-status">
                            <p>Menu unavailable.</p>
                        </div>
                    )}
                    {!menuLoading && !menuError && menuUrl && (
                        <iframe
                            className="menu-frame"
                            src={menuUrl}
                            title={`${card.name} menu`}
                        />
                    )}
                </div>
            )}
        </div>
    )
}
