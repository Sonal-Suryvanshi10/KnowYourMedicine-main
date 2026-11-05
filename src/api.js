import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  headers: { Accept: 'application/json' },
  timeout: 20000,
})

api.interceptors.response.use(
  response => response,
  error => {
    const message = error.response?.data?.message || (error.code === 'ERR_NETWORK' ? 'Cannot reach the server. Start the backend and check MongoDB connection.' : 'Something went wrong. Please try again.')
    return Promise.reject(Object.assign(error, { userMessage: message }))
  },
)
