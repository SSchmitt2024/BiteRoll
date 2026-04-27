import { useState, useRef, useEffect, useCallback } from 'react'
import '../../index.css'
import { logError, logInfo, logWarn } from '../utils/logger.js'
import { authHeaders } from '../utils/apiAuth.js'
import { apiFetch } from '../utils/apiFetch.js'
import { HeartIcon, MenuIcon, CloseIcon } from './Icons.jsx'

export default function SwipeCard({ card, active, liked, likeCount, onToggleLike }) {
    const isFallback = card._isFallback
    const cardTags = Array.isArray(card.tags) ? card.tags.slice(0, 3) : []
    const [menu, setMenu] = useState(null)
    const [menuOpen, setMenuOpen] = useState(false)
    const [menuLoading, setMenuLoading] = useState(false)
    const [menuError, setMenuError] = useState('')
    const [pops, setPops] = useState([])
    const videoRef = useRef(null)
    const lastTap = useRef(0)

    useEffect(() => {
        if (active && !menuOpen) {
            videoRef.current?.play().catch(error => {
                logWarn('video_autoplay_failed', { placeId: card.placeId, message: error.message })
            })
        } else {
            videoRef.current?.pause()
        }
    }, [active, card.placeId, menuOpen])

    const handleDoubleTap = useCallback((e) => {
        const now = Date.now()
        if (now - lastTap.current < 300) {
            const rect = e.currentTarget.getBoundingClientRect()
            const x = e.clientX - rect.left
            const y = e.clientY - rect.top
            const id = now
            setPops(prev => [...prev, { x, y, id }])
            setTimeout(() => setPops(prev => prev.filter(p => p.id !== id)), 900)
            if (!liked) onToggleLike(card.placeId, true)
        }
        lastTap.current = now
    }, [liked, card.placeId, onToggleLike])

    async function handleMenu(e) {
        e.stopPropagation()
        setMenuError('')
        setMenuOpen(true)
        logInfo('menu_opened', { placeId: card.placeId })

        if (menu) return

        setMenuLoading(true)
        logInfo('menu_request_started', { placeId: card.placeId })
        try {
            const headers = await authHeaders()
            const menuResponse = await apiFetch(`/menu?placeId=${card.placeId}`, { headers })
            if (!menuResponse.ok) throw new Error('Menu not found')

            const menuData = await menuResponse.json()
            if (!menuData.menuURL) throw new Error('Menu URL missing')

            const fileResponse = await fetch(menuData.menuURL)
            if (!fileResponse.ok) throw new Error('Menu file unavailable')

            const fileData = await fileResponse.json()
            setMenu(fileData)
            logInfo('menu_request_succeeded', {
                placeId: card.placeId,
                sectionCount: fileData.sections?.length || 0
            })
        } catch (error) {
            setMenuError(error.message || 'Menu unavailable')
            logError('menu_request_failed', { placeId: card.placeId, message: error.message })
        } finally {
            setMenuLoading(false)
        }
    }

    function handleLike(e) {
        e.stopPropagation()
        onToggleLike(card.placeId, !liked)
    }

    return (
        <div className="swipe-card" onClick={handleDoubleTap}>
            <video
                ref={videoRef}
                src={card.video}
                loop
                muted
                playsInline
                preload="auto"
            />

            <div className="card-vignette" />

            {!isFallback && (
                <div className="card-meta">
                    <div className="restaurant-pill">
                        <span className="pill-initial">{card.name?.[0] || 'B'}</span>
                        <span className="pill-name">{card.name}</span>
                    </div>
                    {card.description && (
                        <p className="card-description">{card.description}</p>
                    )}
                    {cardTags.length > 0 && (
                        <div className="card-tags">
                            {cardTags.map(tag => (
                                <span key={tag}>#{tag}</span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {!isFallback && (
                <div className="side-rail" onPointerDown={e => e.stopPropagation()}>
                    <button className="rail-btn" onClick={handleLike}>
                        <HeartIcon size={44} filled={liked} />
                        <span className="rail-label">{likeCount}</span>
                    </button>
                    <button className="rail-btn rail-btn-highlight" onClick={handleMenu}>
                        <MenuIcon size={44} />
                        <span className="rail-label">Menu</span>
                    </button>
                </div>
            )}

            {pops.map(p => (
                <div key={p.id} className="heart-pop"
                    style={{ left: p.x - 60, top: p.y - 60 }}>
                    <HeartIcon size={120} filled />
                </div>
            ))}

            {menuOpen && (
                <>
                    <div className="menu-backdrop"
                        onClick={() => setMenuOpen(false)}
                        style={{ opacity: 1 }} />
                    <div className="menu-sheet" onClick={e => e.stopPropagation()}>
                        <div className="menu-handle" />
                        <div className="menu-header">
                            <div className="menu-restaurant-icon">
                                {(menu?.restaurant || card.name)?.[0] || 'B'}
                            </div>
                            <div className="menu-restaurant-info">
                                <div className="menu-restaurant-name">
                                    {menu?.restaurant || card.name}
                                </div>
                            </div>
                            <button className="menu-close-btn" onClick={() => setMenuOpen(false)}>
                                <CloseIcon size={18} color="#1F2330" />
                            </button>
                        </div>
                        <div className="menu-title-row">
                            <span className="menu-title">Menu</span>
                        </div>
                        <div className="menu-items-scroll">
                            {menuLoading && (
                                <div className="menu-status">
                                    <div className="spinner spinner-sm" />
                                    <p>Loading menu...</p>
                                </div>
                            )}
                            {menuError && (
                                <div className="menu-status">
                                    <p>{menuError}</p>
                                </div>
                            )}
                            {menu?.sections?.map(section => (
                                <div key={section.name} className="menu-section">
                                    <h3 className="menu-section-title">{section.name}</h3>
                                    {section.items.map((item, i) => (
                                        <div key={item.name} className="menu-item"
                                            style={{ borderBottom: i < section.items.length - 1 ? '1px solid rgba(31,35,48,0.08)' : 'none' }}>
                                            <div className="menu-item-info">
                                                <div className="menu-item-name">{item.name}</div>
                                                {item.description && (
                                                    <p className="menu-item-desc">{item.description}</p>
                                                )}
                                            </div>
                                            {item.price != null && (
                                                <div className="menu-item-price">
                                                    ${item.price.toFixed(2)}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
