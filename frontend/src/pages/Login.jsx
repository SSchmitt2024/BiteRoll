//
// Login page
//

import { useState } from 'react'

function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    async function handleSubmit(e) {
        e.preventDefault()
        console.log(`Login Successful\nEmail = ${email}\nPassword = ${password}`)
    }

    return (
        <div className="login-outer-box">
            <div className="login-inner-box">
                <div className="login-cleft">
                    Banner will go here
                </div>
                <div>
                    <form onSubmit={handleSubmit} className="login-form">
                        <label>Enter You're Email
                            <input
                                type="text"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                />
                        </label>
                        <label>Enter You're Password
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                />
                        </label>
                        <button type="submit">Submit</button>
                    </form>
                </div>
            </div>
        </div>
    )
}