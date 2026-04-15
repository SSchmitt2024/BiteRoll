//
// Sign-up page
//

import { useState } from 'react'

export default function SignUp() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPas, setConfirm] = useState('')
    const [fieldErrors, setFieldErrors] = useState({});

    function validate() {
        const errs = {}

        if (password !== confirmPas) {
            errs.confirm = "Your passwords do not match. Please re-enter the correct password"
        }

        return errs;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const errs = validate();
        
        if (Object.keys(errs).length) { 
            setFieldErrors(errs);
            if (errs.confirm) { setPassword(''); setConfirm(''); }
            return;
        }
    }

    return (
        <div className="signup-outer-box">
            <div className="signup-inner-box">
                <div className="signup-cleft">
                    Banner will go here
                </div>
                <div>
                    <form onSubmit={handleSubmit} className="signupClass">
                        <label> Enter your username
                            <input 
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}/>
                        </label>
                        <label> Enter your email
                            <input 
                            type="text"
                            value={email}
                            onChange={e => setEmail(e.target.value)}/>
                        </label>
                        <label> Enter your password
                            <input 
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}/>
                        </label>
                        <label> Confirm your password
                            <input 
                            type="password"
                            value={confirmPas}
                            onChange={e => setConfirm(e.target.value)}/>
                            {fieldErrors.confirm && <p>{fieldErrors.confirm}</p>}
                        </label>
                        <button type="submit">Submit</button>
                    </form>
                </div>
            </div>
        </div>
    )
}