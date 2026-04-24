import { useState } from 'react'
import { useLocation } from 'react-router-dom'

import { COG_USER_POOL_ID, COG_CLIENT_ID } from '../aws-config'
import { CognitoUserPool, CognitoUser, AuthenticationDetails, CognitoUserAttribute } from 'amazon-cognito-identity-js'

const poolData = {
    UserPoolId: COG_USER_POOL_ID,
    ClientId: COG_CLIENT_ID
}

const userPool = new CognitoUserPool(poolData);


export default function Confirm() {
    const [ code, setCode ] = useState('');
    const location = useLocation()

    const email = location.state?.email


    async function handleSubmit(e) {
        e.preventDefault();
        const userPoolDetails = {
            Username: email,
            Pool: userPool,
        }
        const cogUser = new CognitoUser(userPoolDetails);
        
        cogUser.confirmRegistration(code, true, (err, result) => {
            if (err) { 
                console.log(err); 
                return 
            }
            console.log(result)
        })
    }

    return (
        <div className="auth-outer">
            <div className="auth-card">
                <div className="auth-banner">
                    <div className="auth-brand">BiteRoll</div>
                    <p className="auth-tagline">Almost there.</p>
                </div>
                <div className="auth-pane">
                    <form onSubmit={handleSubmit} className="auth-form">
                        <h1 className="auth-title">Confirm your email</h1>
                        <p className="auth-subtitle">
                            {email
                                ? <>We sent a code to <strong>{email}</strong>.</>
                                : 'Enter the code we sent to your email.'}
                        </p>
                        <label className="auth-field">
                            <span>Confirmation code</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={code}
                                onChange={e => setCode(e.target.value)}
                                placeholder="123456"
                                autoComplete="one-time-code"
                            />
                        </label>
                        <button type="submit" className="auth-submit">Confirm</button>
                    </form>
                </div>
            </div>
        </div>
    )
}