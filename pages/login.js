import { useState } from 'react'
import { supabase } from '../utils/supabaseClient'
import { useRouter } from 'next/router'
import { Activity, Loader2, AlertCircle, CheckCircle } from 'lucide-react'

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const router = useRouter()

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (isSignUp) {
        // --- SIGN UP LOGIC ---
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { first_name: firstName, last_name: lastName }, 
          },
        })
        
        if (error) throw error

        // CHECK DUPLICATES: If identities array is empty, the user already exists
        if (data.user && data.user.identities && data.user.identities.length === 0) {
            throw new Error("This email is already registered. Please log in instead.")
        }

        setMessage({ type: 'success', text: 'Success! Check your email to confirm.' })
      } else {
        // --- LOGIN LOGIC ---
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push('/') // Redirect to dashboard
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 placeholder-gray-400"

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-900 font-sans p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-white p-8 pb-0 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-50 rounded-full"><Activity className="w-8 h-8 text-blue-600" /></div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{isSignUp ? 'Create Account' : 'Welcome Back'}</h1>
          <p className="text-gray-500 mt-2 text-sm">{isSignUp ? 'Join the AutoDispatch team' : 'Login to access dashboard'}</p>
        </div>

        <form onSubmit={handleAuth} className="p-8 space-y-4">
          {message && (
            <div className={`p-4 rounded-lg text-sm flex items-start gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
              <span>{message.text}</span>
            </div>
          )}

          {isSignUp && (
            <div className="flex gap-4">
              <div className="w-1/2">
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input required type="text" placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputStyle} />
              </div>
              <div className="w-1/2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input required type="text" placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputStyle} />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input required type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputStyle} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input required type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className={inputStyle} />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 mt-6">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSignUp ? 'Sign Up' : 'Log In'}
          </button>
        </form>

        <div className="bg-gray-50 p-4 text-center text-sm text-gray-600 border-t border-gray-100">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button onClick={() => { setIsSignUp(!isSignUp); setMessage(null); }} className="text-blue-600 font-semibold hover:underline">
            {isSignUp ? 'Log In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  )
}