import { useState, useEffect } from 'react'

export default function Feed() {

    const [restaurants, setRestaurants] = useState([])

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(success, error)
    }, [])


    function success(position) {
        const lat = position.coords.latitude 
        const lng = position.coords.longitude 
        
        fetch(`https://00bws6efnk.execute-api.us-east-2.amazonaws.com/prod/feed?lat=${lat}&lng=${lng}`)
        .then(response => response.json())
        .then(data => {
            setRestaurants(data.restaurants)
        })
    }
    function error(err) {
        console.log(`ERROR: ${err}`)
    }
    
    console.log(restaurants)
    return (
        <div>Feed</div>

    )
}