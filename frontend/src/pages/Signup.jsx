//
// Sign-up page
//

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { COG_USER_POOL_ID, COG_CLIENT_ID } from '../aws-config'
import { CognitoUserPool, CognitoUser, AuthenticationDetails, CognitoUserAttribute } from 'amazon-cognito-identity-js'

const poolData = {
    UserPoolId: COG_USER_POOL_ID,
    ClientId: COG_CLIENT_ID
}

const userPool = new CognitoUserPool(poolData)

export default function SignUp() {
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPas, setConfirm] = useState('')
    const [fieldErrors, setFieldErrors] = useState({})
    const navigate = useNavigate()

    function validate() {
        const errs = {}

        if (password !== confirmPas) {
            errs.confirm = "Your passwords do not match. Please re-enter the correct password"
        }

        return errs
    }

    async function handleSubmit(e) {
        e.preventDefault()
        const errs = validate()
        setFieldErrors({})
        
        if (Object.keys(errs).length) { 
            setFieldErrors(errs)
            if (errs.confirm) { 
                setPassword('') 
                setConfirm('') 
            }
            return
        }

        const attributeList = [
            new CognitoUserAttribute({ Name: 'email', Value: email }),
            new CognitoUserAttribute({ Name: 'preferred_username', Value: username }),
        ]
        function callback(err, result){
            if (err) {
                console.log(err)
                return
            }
            console.log(result)
            navigate('/confirm', { state: { email: email } })
        }
        userPool.signUp(email, password, attributeList, null, callback)
        
    }

    return (
        <div className="auth-outer">
            <div className="auth-card">
                <div className="auth-banner">
                    <div className="auth-brand">BiteRoll</div>
                    <p className="auth-tagline">Find your next favorite meal.</p>
                </div>
                <div className="auth-pane">
                    <form onSubmit={handleSubmit} className="auth-form">
                        <h1 className="auth-title">Create your account</h1>
                        <p className="auth-subtitle">Start discovering bites nearby.</p>
                        <label className="auth-field">
                            <span>Username</span>
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                placeholder="hungryhuman"
                                autoComplete="username"
                            />
                        </label>
                        <label className="auth-field">
                            <span>Email</span>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                autoComplete="email"
                            />
                        </label>
                        <label className="auth-field">
                            <span>Password</span>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                autoComplete="new-password"
                            />
                        </label>
                        <label className="auth-field">
                            <span>Confirm password</span>
                            <input
                                type="password"
                                value={confirmPas}
                                onChange={e => setConfirm(e.target.value)}
                                placeholder="••••••••"
                                autoComplete="new-password"
                            />
                            {fieldErrors.confirm && <p className="auth-error">{fieldErrors.confirm}</p>}
                        </label>
                        <button type="submit" className="auth-submit">Create account</button>
                    </form>
                </div>
            </div>
        </div>
    )
}