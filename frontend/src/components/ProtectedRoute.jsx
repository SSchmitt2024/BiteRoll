import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { CognitoUserPool } from 'amazon-cognito-identity-js'
import { COG_USER_POOL_ID, COG_CLIENT_ID } from '../aws-config'

const userPool = new CognitoUserPool({
    UserPoolId: COG_USER_POOL_ID,
    ClientId: COG_CLIENT_ID,
})

export default function ProtectedRoute({ children }) {
    const [authState, setAuthState] = useState('checking')

    useEffect(() => {
        const user = userPool.getCurrentUser()
        if (!user) {
            setAuthState('unauthenticated')
            return
        }
        user.getSession((err) => {
            setAuthState(err ? 'unauthenticated' : 'authenticated')
        })
    }, [])

    if (authState === 'checking') return null
    if (authState === 'unauthenticated') return <Navigate to="/login" replace />
    return children
}
