import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Activity, ArrowLeft, ArrowRight, Box, Pill, CheckCircle2, ChevronDown, CircleHelp, Clock3, CreditCard, Database, ExternalLink, FileText, Home, Hospital, Info, LayoutDashboard, LocateFixed, LogIn, LogOut, MapPin, Menu, Minus, PackageCheck, Plus, Search, ShieldCheck, ShoppingBag, ShoppingCart, Store, Trash2, Truck, User, UserPlus, Users, X, HeartHandshake, Mail, MessageCircle, Shield, Stethoscope, CircleUserRound } from 'lucide-react'
import { api } from './api.js'
import MedicineAssistant from './components/MedicineAssistant.jsx'
import './App.css'

const AuthContext = createContext(null)
const useAuth = () => useContext(AuthContext)
const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value || 0))
const date = value => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const currentYear = new Date().getFullYear()

function AuthProvider({ children }) {
  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cartCount, setCartCount] = useState(0)
  useEffect(() => {
    let active = true
    const loadSession = async () => {
      try {
        const { data } = await api.get('/auth/me')
        if (!active) return
        setAccount(data.account)
        if (data.account?.role === 'user') {
          const cart = await api.get('/cart')
          if (active) setCartCount(cart.data.cart.count)
        } else setCartCount(0)
      } catch (error) {
        if (active) {
          setAccount(null)
          setCartCount(0)
          if (error.response && error.response.status !== 401) console.error('Session check failed:', error.response.data?.message || error.message)
          else if (!error.response) console.error('Cannot reach the API. Check that the backend is running and MongoDB is connected.')
        }
      }
      finally { if (active) setLoading(false) }
    }
    loadSession()
    return () => { active = false }
  }, [])
  const value = useMemo(() => ({ account, setAccount, loading, cartCount, setCartCount }), [account, loading, cartCount])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function App() {
  return <BrowserRouter><AuthProvider><Routes>
    <Route element={<SiteLayout/>}>
      <Route path="/" element={<HomePage/>}/>
      <Route path="/search" element={<SearchPage/>}/>
      <Route path="/medicines" element={<MedicinesPage/>}/>
      <Route path="/about" element={<AboutPage/>}/>
      <Route path="/contact" element={<ContactPage/>}/>
      <Route path="/login" element={<LoginPage/>}/>
      <Route path="/admin/login" element={<LoginPage fixedRole="admin"/>}/>
      <Route path="/register" element={<RegistrationChoice/>}/>
      <Route path="/register/user" element={<RegistrationPage role="user"/>}/>
      <Route path="/register/store" element={<RegistrationPage role="store"/>}/>
      <Route path="/error" element={<ErrorPage/>}/>
      <Route element={<PrivateRoute role="user"/>}>
        <Route path="/dashboard" element={<UserDashboard/>}/>
        <Route path="/checkout" element={<CheckoutPage/>}/>
        <Route path="/orders" element={<OrderHistory/>}/>
        <Route path="/orders/:orderId" element={<OrderTracking/>}/>
        <Route path="/order-confirmation/:orderId" element={<OrderConfirmation/>}/>
      </Route>
      <Route element={<PrivateRoute role="store"/>}><Route path="/store" element={<StoreDashboard/>}/></Route>
      <Route element={<PrivateRoute role="admin"/>}><Route path="/admin" element={<AdminDashboard/>}/></Route>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Route>
  </Routes></AuthProvider></BrowserRouter>
}

function SiteLayout() {
  const { account, loading, cartCount, setAccount } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()
  const accountPath = account?.role === 'admin' ? '/admin' : account?.role === 'store' ? '/store' : '/dashboard'
  useEffect(() => {
    if (!profileOpen) return undefined
    const closeOnOutsideClick = event => {
      if (!profileRef.current?.contains(event.target)) setProfileOpen(false)
    }
    const closeOnEscape = event => {
      if (event.key === 'Escape') setProfileOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [profileOpen])
  const logout = async () => {
    await api.post('/auth/logout').catch(() => {})
    setAccount(null)
    setProfileOpen(false)
    navigate('/')
  }
  return <div className="app-shell min-h-screen bg-slate-50 text-slate-900">
    <header className="topbar">
      <Link to="/" className="brand"><span className="brand-mark"><Pill size={24}/></span><span><strong>Know Your Medicine</strong><small>INFORMATION FOR BETTER CHOICES</small></span></Link>
      <button className="mobile-menu" onClick={()=>setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen?<X/>:<Menu/>}</button>
      <nav onClick={()=>{setMenuOpen(false);setProfileOpen(false)}} className={menuOpen?'main-nav nav-open':'main-nav'}>
        <Link className={location.pathname==='/'?'active':''} to="/"><Home size={17}/><span>Home</span></Link>
        <Link className={location.pathname==='/medicines'||location.pathname==='/search'?'active':''} to="/medicines"><Pill size={17}/><span>Medicines</span></Link>
        <Link className={location.pathname==='/about'?'active':''} to="/about"><Info size={17}/><span>About</span></Link>
        <Link className={location.pathname==='/contact'?'active':''} to="/contact"><Mail size={17}/><span>Contact</span></Link>
        {account?.role==='user'&&<Link className="cart-link" to="/dashboard"><ShoppingCart size={17}/><span className="cart-label">Cart</span><span className="cart-count">{cartCount}</span></Link>}
        {!loading&&!account&&<><Link to="/register"><UserPlus size={17}/><span>Sign up</span></Link><Link className="nav-login" to="/login"><LogIn size={16}/><span>Login</span></Link></>}
        {account&&<div className="profile-menu" ref={profileRef} onClick={event=>event.stopPropagation()}>
          <button className={`profile-trigger${profileOpen?' is-open':''}`} type="button" onClick={()=>setProfileOpen(open=>!open)} aria-expanded={profileOpen} aria-haspopup="menu" aria-label="Open profile menu"><CircleUserRound size={20}/><span>Profile</span><ChevronDown size={14}/></button>
          {profileOpen&&<div className="profile-dropdown" role="menu">
            <div className="profile-summary"><span className="profile-avatar">{account.name?.[0]?.toUpperCase()||<User size={17}/>}</span><span><b>{account.name||'Account'}</b><small>{account.email}</small><small className="profile-role">{account.role}</small></span></div>
            <Link to={accountPath} role="menuitem" onClick={()=>{setProfileOpen(false);setMenuOpen(false)}}><LayoutDashboard size={16}/>{account.role==='user'?'My dashboard':'My account & dashboard'}</Link>
            <button type="button" role="menuitem" className="profile-signout" onClick={()=>{setMenuOpen(false);logout()}}><LogOut size={16}/>Sign out</button>
          </div>}
        </div>}
      </nav>
    </header>
    <main className="page-content"><Outlet/></main>
    <footer className="site-footer"><div className="footer-main"><Link to="/" className="brand footer-brand"><span className="brand-mark"><Pill size={22}/></span><span><strong>Know Your Medicine</strong><small>CARE STARTS WITH KNOWLEDGE</small></span></Link><p>Search medicines, understand how they are used, and connect with local stores.</p><div><Link to="/medicines">Medicine catalog</Link><Link to="/about">About us</Link><Link to="/contact">Contact &amp; support</Link><Link to="/login">User sign in</Link><Link to="/admin/login">Admin sign in</Link><Link to="/register/store">Store registration</Link></div></div><div className="footer-bottom">© {currentYear} Know Your Medicine <span>For medicine questions, always consult a qualified healthcare professional.</span></div></footer>
    <MedicineAssistant/>
  </div>
}

function MedicinesPage() {
  const [medicines, setMedicines] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const { account, setCartCount } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    api.get('/medicines').then(({ data }) => {
      if (active) setMedicines(data.medicines)
    }).catch(err => {
      if (active) setError(err.userMessage)
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [])

  const addToCart = async (medicine, checkout = false) => {
    if (!account) return navigate('/login')
    setError('')
    setNotice('')
    try {
      const { data } = await api.post('/cart', { medicineId: medicine._id, quantity: 1 })
      setCartCount(data.cart.count)
      setNotice(`${medicine.name} added to your cart.`)
      if (checkout) navigate('/checkout')
    } catch (err) {
      setError(err.userMessage)
    }
  }
  const visibleMedicines = medicines.filter(medicine => `${medicine.name} ${medicine.description || ''} ${medicine.benefits || ''}`.toLowerCase().includes(query.trim().toLowerCase()))

  return <section className="content-page medicines-page">
    <PageTitle eyebrow="OUR CATALOG" title="Explore medicines" subtitle="Browse medicine information and availability from participating stores."/>
    <form className="catalog-search" onSubmit={event => event.preventDefault()}><Search/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by medicine, use, or benefit..." aria-label="Filter medicines"/></form>
    <p className="catalog-count">{loading ? 'Loading catalog…' : `${visibleMedicines.length} ${visibleMedicines.length === 1 ? 'medicine' : 'medicines'} available`}</p>
    {notice&&<Notice tone="success">{notice}</Notice>}
    {error&&<Notice tone="error">{error}</Notice>}
    {loading?<Loading/>:visibleMedicines.length?<div className="medicine-grid">{visibleMedicines.map(medicine=><MedicineCard key={medicine._id} medicine={medicine} onAdd={()=>addToCart(medicine)} onBuy={()=>addToCart(medicine,true)}/>)}</div>:<EmptyState icon={Search} title={medicines.length?'No matching medicines':'No medicines in the catalog'} text={medicines.length?'Try searching for a different name or use.':'Medicines will appear here when a store or admin adds them to the catalog.'}/>}
  </section>
}

function AboutPage() {
  return <section className="content-page public-info-page">
    <PageTitle eyebrow="ABOUT US" title="Better information. Better conversations." subtitle="Know Your Medicine helps people explore medicine information and connect with local availability."/>
    <div className="info-hero"><span className="info-hero-icon"><HeartHandshake size={30}/></span><div><h2>Knowledge that supports—not replaces—care</h2><p>Our catalog brings together medicine details, prices, and participating store listings. Use it as a starting point for informed conversations with a qualified healthcare professional.</p></div></div>
    <div className="info-card-grid"><article className="info-card"><Search/><h3>Explore clearly</h3><p>Search medicine listings and review the descriptions, dosage information, benefits, and possible side effects supplied for each listing.</p></article><article className="info-card"><Store/><h3>Find availability</h3><p>Review listed prices and store information, then use the existing cart and checkout flow when you are ready to place an order.</p></article><article className="info-card"><Shield/><h3>Use information safely</h3><p>Medicine details are general information only. Follow your prescription and the product label, and ask a healthcare professional about personal treatment decisions.</p></article></div>
    <div className="public-info-cta"><div><b>Ready to explore the catalog?</b><span>Search participating store listings and medicine details.</span></div><Link className="button button-primary" to="/medicines">Browse medicines <ArrowRight size={16}/></Link></div>
  </section>
}

function ContactPage() {
  return <section className="content-page public-info-page">
    <PageTitle eyebrow="CONTACT & SUPPORT" title="How can we help?" subtitle="Choose the right place for questions about the catalog, orders, or medicine information."/>
    <div className="contact-grid"><article className="contact-card"><span><ShoppingBag/></span><h2>Order or account help</h2><p>Sign in to review your cart, order history, and order status. Your existing account and checkout tools are available here.</p><Link className="text-link" to="/login">Go to sign in <ArrowRight size={15}/></Link></article><article className="contact-card"><span><Stethoscope/></span><h2>Medicine questions</h2><p>For general information, open the medicine assistant. It cannot diagnose, recommend a personal dose, or replace a pharmacist or doctor.</p><button className="text-link contact-assistant-link" onClick={() => window.dispatchEvent(new Event('open-medicine-assistant'))}><MessageCircle size={16}/> Open medicine assistant</button></article><article className="contact-card"><span><Mail/></span><h2>Store or listing questions</h2><p>For availability, pricing, or a medicine listing, contact the store shown on the medicine card. Store owners can manage listings from the store dashboard.</p><Link className="text-link" to="/medicines">View store listings <ArrowRight size={15}/></Link></article></div>
    <div className="health-note contact-health-note"><ShieldCheck/><div><b>Need personal medical advice?</b><span>Contact a licensed doctor or pharmacist. If you think you may be having a medical emergency, contact your local emergency service immediately.</span></div></div>
  </section>
}

function PrivateRoute({ role }) {
  const { account, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Loading/>
  if (!account) return <Navigate to={role==='admin'?'/admin/login':'/login'} state={{ from: location }} replace/>
  if (account.role !== role) return <Navigate to={account.role==='admin'?'/admin':account.role==='store'?'/store':'/dashboard'} replace/>
  return <Outlet/>
}

function HomePage() {
  const [query, setQuery] = useState('')
  const [featured, setFeatured] = useState([])
  const [nearbyPlaces, setNearbyPlaces] = useState([])
  const [mapCenter, setMapCenter] = useState(null)
  const [mapError, setMapError] = useState('')
  const [locationLoading, setLocationLoading] = useState(false)
  const navigate = useNavigate()
  const { account, setCartCount } = useAuth()
  const [notice, setNotice] = useState('')
  useEffect(()=>{api.get('/medicines').then(({data})=>setFeatured(data.medicines.slice(0,4))).catch(()=>{})},[])
  const addToCart = async (medicine, checkout = false) => { if (!account) return navigate('/login'); try { const {data}=await api.post('/cart',{medicineId:medicine._id,quantity:1}); setCartCount(data.cart.count); setNotice(`${medicine.name} added to your cart.`); if(checkout) navigate('/checkout') } catch(error) { setNotice(error.userMessage) } }
  const search = e => { e.preventDefault(); navigate(`/search?q=${encodeURIComponent(query.trim())}`) }
  const findNearbyPlaces = () => {
    if (!navigator.geolocation) {
      setMapError('Location is unavailable in this browser. Opening nearby medical facilities in Google Maps.')
      window.open('https://www.google.com/maps/search/medical+stores+and+hospitals+near+me', '_blank', 'noopener,noreferrer')
      return
    }
    setLocationLoading(true)
    setMapError('')
    setNearbyPlaces([])
    navigator.geolocation.getCurrentPosition(async ({coords}) => {
      const {latitude, longitude} = coords
      setMapCenter({latitude, longitude})
      const query = `[out:json][timeout:15];nwr["amenity"~"pharmacy|hospital|clinic"](around:5000,${latitude},${longitude});out center tags;`
      try {
        const endpoints = [
          'https://overpass-api.de/api/interpreter',
          'https://overpass.kumi.systems/api/interpreter',
          'https://overpass.private.coffee/api/interpreter',
        ]
        let result
        let lastError
        for (const endpoint of endpoints) {
          try {
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
              body: `data=${encodeURIComponent(query)}`,
              signal: AbortSignal.timeout(10000),
            })
            if (!response.ok) {
              lastError = new Error(`Nearby place service returned ${response.status}.`)
              if (response.status < 500 && response.status !== 429) break
              continue
            }
            result = await response.json()
            break
          } catch (error) {
            lastError = error
          }
        }
        if (!result) throw new Error(lastError?.name === 'TimeoutError'
          ? 'Nearby place search timed out. Please try again.'
          : 'Nearby place search is temporarily unavailable. The map is still centered on your location.')
        const places = (result.elements || []).map(place => ({
          id: place.id,
          name: place.tags?.name || place.tags?.['name:en'] || 'Medical facility',
          type: place.tags?.amenity,
          latitude: place.lat ?? place.center?.lat,
          longitude: place.lon ?? place.center?.lon,
        })).filter(place => Number.isFinite(place.latitude) && Number.isFinite(place.longitude))
        setNearbyPlaces(places)
        if (!places.length) setMapError('No pharmacies or hospitals were found nearby. The map is still centered on your location.')
      } catch (error) {
        setMapError(error.message || 'Could not load nearby places. The map is still available.')
      } finally {
        setLocationLoading(false)
      }
    }, error => {
      setLocationLoading(false)
      setMapError(error.code === error.PERMISSION_DENIED
        ? 'Location permission was denied. Allow it in browser settings, or use the general nearby map.'
        : 'Could not get your location. Check browser location permission and try again.')
      if (error.code === error.PERMISSION_DENIED) window.open('https://www.google.com/maps/search/medical+stores+and+hospitals+near+me', '_blank', 'noopener,noreferrer')
    }, {enableHighAccuracy: true, timeout: 12000, maximumAge: 60000})
  }
  const mapUrl = mapCenter
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${mapCenter.longitude - 0.045}%2C${mapCenter.latitude - 0.035}%2C${mapCenter.longitude + 0.045}%2C${mapCenter.latitude + 0.035}&layer=mapnik&marker=${mapCenter.latitude}%2C${mapCenter.longitude}`
    : ''
  return <>
    <section className="hero-section"><div className="hero-copy"><h1><Pill size={38}/> Know Your Medicine</h1><p>Find detailed information about medicines and their uses.</p></div></section>
    <section className="home-search-area"><button className="nearby-button" onClick={findNearbyPlaces} disabled={locationLoading}><MapPin size={22}/>{locationLoading?'Finding nearby places…':'Find Nearby Medical Stores & Hospitals'}<ArrowRight size={17}/></button><form className="hero-search" onSubmit={search}><Search size={20}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search for a medicine..." aria-label="Search medicines" required/><button>Search <ArrowRight size={16}/></button></form><div className="home-stethoscope"><Activity size={72}/><p>Explore reliable medical information here!</p></div><section className="nearby-map-card" aria-label="Nearby medical stores and hospitals"><div className="map-card-heading"><div><span className="map-heading-icon"><Hospital size={21}/></span><span><b>Nearby Medical Stores &amp; Hospitals</b><small>Find pharmacies and hospitals around your current location</small></span></div><button className="map-locate-button" onClick={findNearbyPlaces} disabled={locationLoading}><LocateFixed size={17}/>{locationLoading?'Locating…':'Use my location'}</button></div>{mapCenter?<div className="live-map-layout"><div className="live-map-frame"><iframe title="Live map of nearby medical facilities" src={mapUrl} loading="lazy" referrerPolicy="no-referrer" allowFullScreen/><a href={`https://www.openstreetmap.org/?mlat=${mapCenter.latitude}&mlon=${mapCenter.longitude}#map=15/${mapCenter.latitude}/${mapCenter.longitude}`} target="_blank" rel="noreferrer" className="map-open-link">Open full map <ExternalLink size={14}/></a></div><div className="nearby-place-list"><h3>Places near you <span>{nearbyPlaces.length}</span></h3>{nearbyPlaces.length?nearbyPlaces.slice(0,8).map(place=><a className="nearby-place" key={`${place.type}-${place.id}`} href={`https://www.openstreetmap.org/?mlat=${place.latitude}&mlon=${place.longitude}#map=18/${place.latitude}/${place.longitude}`} target="_blank" rel="noreferrer"><span className="place-pin"><MapPin size={16}/></span><span><b>{place.name}</b><small>{place.type==='pharmacy'?'Medical store':place.type==='hospital'?'Hospital':'Clinic'}</small></span><ExternalLink size={13}/></a>):<p className="map-empty">Nearby places will appear here when available.</p>}</div></div>:<button className="map-placeholder" onClick={findNearbyPlaces} disabled={locationLoading}><span className="map-placeholder-icon"><MapPin size={28}/></span><b>{locationLoading?'Getting your location…':'Show nearby places on a live map'}</b><small>We’ll only use your location after you allow access.</small><span className="map-placeholder-action"><LocateFixed size={16}/> Find on map</span></button>}{mapError&&<p className="map-message" role="status">{mapError}</p>}<p className="map-attribution">Map data © OpenStreetMap contributors</p></section><Link className="home-register-link" to="/register">Create an account <ArrowRight size={15}/></Link></section>
    <section className="value-strip"><div><Search/><span><b>Search with ease</b><small>Find information by medicine name</small></span></div><div><FileText/><span><b>Understand the details</b><small>Dosage, benefits, and side effects</small></span></div><div><Store/><span><b>Connect locally</b><small>See prices and store availability</small></span></div></section>
    <section className="featured-section"><div className="section-head"><div><div className="eyebrow dark-eyebrow">EXPLORE THE CATALOG</div><h2>Popular medicines</h2><p>Browse the catalog or search for a specific medicine.</p></div><Link className="text-link" to="/search">View all medicines <ArrowRight size={16}/></Link></div>{notice&&<Notice tone={notice.includes('added')?'success':'error'}>{notice}</Notice>}{featured.length?<div className="medicine-grid">{featured.map(item=><MedicineCard key={item._id} medicine={item} onAdd={()=>addToCart(item)} onBuy={()=>addToCart(item,true)}/>)}</div>:<EmptyState icon={Database} title="Your catalog is getting ready" text="Search will show medicines as soon as the catalog is connected."/>}</section>
    <section className="health-note"><Activity/><div><b>Health information is not a diagnosis</b><span>Medicine details on this site are provided for general information. Follow your prescriber's advice and the medicine label. Ask a qualified healthcare professional before changing how you take a medicine.</span></div></section>
  </>
}

function SearchPage() {
  const [searchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') || ''
  return <SearchResults key={initialQuery} initialQuery={initialQuery}/>
}

function SearchResults({ initialQuery }) {
  const q = initialQuery
  const [medicines,setMedicines]=useState([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [query,setQuery]=useState(initialQuery)
  const navigate=useNavigate()
  const {account,setCartCount}=useAuth()
  useEffect(()=>{let active=true;api.get('/medicines',{params:{q}}).then(({data})=>{if(active)setMedicines(data.medicines)}).catch(err=>{if(active)setError(err.userMessage)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[q])
  const search=e=>{e.preventDefault();navigate(`/search?q=${encodeURIComponent(query.trim())}`)}
  const add=async medicine=>{if(!account){navigate('/login');return}try{const {data}=await api.post('/cart',{medicineId:medicine._id,quantity:1});setCartCount(data.cart.count);setError(`${medicine.name} added to your cart.`)}catch(err){setError(err.userMessage)}}
  const buy=async medicine=>{if(!account){navigate('/login');return}try{const {data}=await api.post('/cart',{medicineId:medicine._id,quantity:1});setCartCount(data.cart.count);navigate('/checkout')}catch(err){setError(err.userMessage)}}
  return <section className="content-page search-page"><PageTitle eyebrow="" title="Know Your Medicine - Search Results" subtitle=""/><form className="catalog-search" onSubmit={search}><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search for a medicine..."/><button className="button button-primary">Search</button></form>{q&&<p className="result-summary">Search Results for: <strong>{q}</strong></p>}{error&&<Notice tone={error.includes('added')?'success':'error'}>{error}</Notice>}{loading?<Loading/>:medicines.length?<div className="table-wrap search-results-table"><table><thead><tr><th>Name</th><th>Description</th><th>Dosage</th><th>Side Effects</th><th>Benefits</th><th>Price</th><th>Actions</th></tr></thead><tbody>{medicines.map(item=><tr key={item._id}><td>{item.name}</td><td>{item.description||'—'}</td><td>{item.dosage||'See label'}</td><td>{item.sideEffects||'—'}</td><td>{item.benefits||'—'}</td><td>{money(item.price)}</td><td><div className="search-actions"><button className="button button-primary" onClick={()=>buy(item)} disabled={item.stock<1}><ShoppingBag size={15}/> Buy Now</button><button className="button button-secondary" onClick={()=>add(item)} disabled={item.stock<1}><ShoppingCart size={15}/> Add to Cart</button></div></td></tr>)}</tbody></table></div>:<EmptyState icon={Search} title={q?'No medicines found':'No medicines in the catalog'} text={q?'Try a shorter or different search term.':'Please check back after a store or admin adds the catalog.'}/>}</section>
}

function MedicineCard({medicine,onAdd,onBuy}) {
  const [expanded,setExpanded]=useState(false)
  return <article className="medicine-card"><div className="medicine-card-top"><span className="medicine-icon"><Pill size={24}/></span><span className={medicine.stock>0?'stock-tag':'stock-tag out'}>{medicine.stock>0?`${medicine.stock} in stock`:'Out of stock'}</span></div><h3>{medicine.name}</h3>{medicine.store?.storeName&&<small className="store-name"><Store size={13}/>{medicine.store.storeName}</small>}<p className="medicine-desc">{medicine.description||'Medicine information has not been added yet.'}</p><div className="medicine-quick"><span><small>Dosage</small><b>{medicine.dosage||'See label'}</b></span><span><small>Price</small><b>{money(medicine.price)}</b></span></div><button className="details-toggle" onClick={()=>setExpanded(!expanded)}>{expanded?'Hide details':'Medicine details'} <ChevronDown size={15}/></button>{expanded&&<div className="medicine-details"><p><b>Benefits:</b> {medicine.benefits||'Not provided.'}</p><p><b>Side effects:</b> {medicine.sideEffects||'Not provided.'}</p></div>}<div className="card-actions"><button className="button button-secondary" onClick={onAdd} disabled={!onAdd||medicine.stock<1}><ShoppingCart size={16}/> Add to cart</button><button className="button button-primary" onClick={onBuy} disabled={!onBuy||medicine.stock<1}>Buy now</button></div></article>
}

function LoginPage({fixedRole}) {
  const [role,setRole]=useState(fixedRole||'user')
  const [form,setForm]=useState({email:'',password:''})
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const {setAccount}=useAuth()
  const navigate=useNavigate()
  const location=useLocation()
  const submit=async e=>{e.preventDefault();setBusy(true);setError('');try{const {data}=await api.post('/auth/login',{...form,accountType:role});setAccount(data.account);navigate(location.state?.from?.pathname||(role==='admin'?'/admin':role==='store'?'/store':'/dashboard'),{replace:true})}catch(err){setError(err.userMessage)}finally{setBusy(false)}}
  return <section className="auth-page"><div className="auth-intro"><Link className="auth-back" to="/">{fixedRole?'⌂ Go to Home':'← Back'}</Link><div className="eyebrow dark-eyebrow">WELCOME BACK</div><h1>Know Your Medicine</h1><p>{fixedRole?'Admin login':'Login to access personalized features.'}</p></div><form className="form-card" onSubmit={submit}><h2><LogIn size={25}/>{fixedRole?' Admin Login':' Login'}</h2><p>Enter your account details to continue.</p>{!fixedRole&&<fieldset className="role-picker"><legend>Account type</legend>{['user','store'].map(type=><button type="button" onClick={()=>setRole(type)} className={role===type?'selected':''} key={type}>{type==='user'?<User/>:<Store/>}{type==='user'?'User':'Store'}</button>)}</fieldset>}<label>{role==='store'?'Store Email':'Email'}<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} autoComplete="username" required placeholder="Enter your email"/></label><label>Password<input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} autoComplete="current-password" required placeholder="Enter your password"/></label>{error&&<Notice tone="error">{error}</Notice>}<button className="button button-primary button-wide" disabled={busy}>{busy?'Signing in…':`Login as ${role==='store'?'Store':role==='admin'?'Admin':'User'}`} <ArrowRight size={16}/></button>{!fixedRole&&<Link className="admin-login-link" to="/admin/login"><ShieldCheck size={15}/> Admin Login</Link>}<p className="form-bottom">New here? <Link to="/register">Register Now</Link></p></form></section>
}

function RegistrationChoice(){return <section className="content-page registration-choice"><PageTitle eyebrow="" title="Registration Selection" subtitle="Please select the type of registration."/><div className="choice-panel"><h2><Users size={26}/> Choose Registration Type</h2><Link to="/register/user"><User size={17}/> User Registration</Link><Link to="/register/store"><Store size={17}/> Store Registration</Link></div></section>}

function RegistrationPage({role}) {
  const store=role==='store'
  const [form,setForm]=useState(store?{storeName:'',storeEmail:'',location:'',contactNumber:'',password:'',confirmPassword:''}:{fullName:'',email:'',password:'',confirmPassword:''})
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const {setAccount}=useAuth()
  const navigate=useNavigate()
  const fields=store?[['storeName','Store name','text'],['storeEmail','Store email','email'],['location','Store location','text'],['contactNumber','Contact number','tel'],['password','Password','password'],['confirmPassword','Confirm password','password']]:[['fullName','Full name','text'],['email','Email address','email'],['password','Password','password'],['confirmPassword','Confirm password','password']]
  const submit=async e=>{e.preventDefault();setBusy(true);setError('');try{const {data}=await api.post(`/auth/register/${role}`,form);setAccount(data.account);navigate(store?'/store':'/dashboard')}catch(err){setError(err.userMessage || (err.code==='ERR_NETWORK'?'The server or database is unavailable. Start the API and check the MongoDB connection.':'Could not create your account. Please review the details and try again.'))}finally{setBusy(false)}}
  return <section className="auth-page"><div className="auth-intro"><Link className="auth-back" to="/"><Home size={14}/> Go to Home</Link><div className="eyebrow dark-eyebrow">CREATE AN ACCOUNT</div><h1>{store?'Store Registration':'User Registration'}</h1><p>{store?'Fill out the form to register your store.':'Fill out the form to create a user account.'}</p></div><form className="form-card" onSubmit={submit}><h2>{store?<><Store size={23}/> Register Store</>:<><User size={23}/> Register User</>}</h2>{fields.map(([name,label,type])=><label key={name}>{label}<input type={type} value={form[name]} onChange={e=>setForm({...form,[name]:e.target.value})} autoComplete={name.includes('password')?'new-password':name.toLowerCase().includes('email')?'email':'name'} required minLength={type==='password'?8:undefined} placeholder={`Enter ${label.toLowerCase()}`}/></label>)}{error&&<Notice tone="error">{error}</Notice>}<button className="button button-primary button-wide" disabled={busy}>{busy?'Creating account…':store?'Register Store':'Register'} <ArrowRight size={16}/></button><p className="form-bottom">Already registered? <Link to="/login">Sign in</Link></p></form></section>
}

function UserDashboard(){
  const {account,setCartCount}=useAuth()
  const [cart,setCart]=useState(null)
  const [error,setError]=useState('')
  const [query,setQuery]=useState('')
  const [orders,setOrders]=useState([])
  const navigate=useNavigate()
  const load=useCallback(()=>Promise.all([api.get('/cart'),api.get('/orders')]).then(([cartRes,orderRes])=>{setCart(cartRes.data.cart);setCartCount(cartRes.data.cart.count);setOrders(orderRes.data.orders.slice(0,3))}).catch(err=>setError(err.userMessage)),[setCartCount])
  useEffect(()=>{load()},[load])
  const update=async(id,quantity)=>{try{const {data}=await api.patch(`/cart/${id}`,{quantity});setCart(data.cart);setCartCount(data.cart.count)}catch(err){setError(err.userMessage)}}
  const remove=async id=>{try{const {data}=await api.delete(`/cart/${id}`);setCart(data.cart);setCartCount(data.cart.count)}catch(err){setError(err.userMessage)}}
  return <section className="content-page user-dashboard"><PageTitle eyebrow="" title="Know Your Medicine" subtitle="" showActions={false}/><div className="user-profile-card"><span className="user-avatar">{account?.name?.[0]?.toUpperCase()||'U'}</span><span><b>{account?.name||'User'}</b><small>{account?.email}</small></span><span className="cart-summary"><b>Items in Cart: {cart?.count||0}</b><b>Total: {money(cart?.total||0)}</b></span></div><div className="dashboard-welcome"><div><h1>Welcome, {account?.name||'there'}!</h1><p>We are glad to have you here. Explore the latest medicines and get personalized recommendations.</p></div><Link className="button button-secondary" to="/orders"><FileText size={17}/> My orders</Link></div><form className="catalog-search" onSubmit={e=>{e.preventDefault();navigate(`/search?q=${encodeURIComponent(query)}`)}}><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search for a medicine..." required/><button className="button button-primary">Search</button></form>{error&&<Notice tone="error">{error}</Notice>}<div className="dashboard-columns"><section className="panel cart-panel"><div className="panel-heading"><div><span className="panel-icon"><ShoppingCart/></span><div><h2>Your medicine cart</h2><small>{cart?.count||0} item(s)</small></div></div>{cart?.items?.length>0&&<button className="quiet-button" onClick={async()=>{await api.delete('/cart');setCart({items:[],count:0,total:0});setCartCount(0)}}>Clear cart</button>}</div>{!cart?<Loading/>:cart.items.length===0?<EmptyState icon={ShoppingCart} title="Your cart is empty" text="Search the catalog and add medicines you need."/>:<><div className="cart-list">{cart.items.map(item=><div className="cart-line" key={item.medicine._id}><div className="cart-line-icon"><Pill/></div><div className="cart-line-info"><b>{item.medicine.name}</b><small>{money(item.medicine.price)} each</small></div><div className="quantity-control"><button onClick={()=>update(item.medicine._id,item.quantity-1)} aria-label="Decrease quantity"><Minus size={14}/></button><span>{item.quantity}</span><button onClick={()=>update(item.medicine._id,item.quantity+1)} aria-label="Increase quantity"><Plus size={14}/></button></div><b>{money(item.lineTotal)}</b><button className="icon-action danger" onClick={()=>remove(item.medicine._id)} aria-label="Remove from cart"><Trash2 size={17}/></button></div>)}</div><div className="cart-total"><span>Total</span><b>{money(cart.total)}</b></div><button className="button button-primary" onClick={()=>navigate('/checkout')}>Proceed to checkout <ArrowRight size={16}/></button></>}</section><section className="panel recent-panel"><div className="panel-heading"><div><span className="panel-icon"><Clock3/></span><div><h2>Recent orders</h2><small>Your latest purchases</small></div></div><Link to="/orders" className="quiet-link">View all</Link></div>{orders.length?orders.map(order=><Link className="recent-order" key={order._id} to={`/orders/${order.orderId}`}><span className="order-symbol"><PackageCheck/></span><span><b>{order.orderId}</b><small>{date(order.createdAt)}</small></span><span className="status-pill">{order.status}</span><b>{money(order.totalAmount)}</b></Link>):<EmptyState icon={PackageCheck} title="No orders yet" text="Your order history will appear here."/>}</section></div></section>
}

function CheckoutPage(){
  const [cart,setCart]=useState(null)
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const [paymentMethod,setPaymentMethod]=useState('COD')
  const {account,setCartCount}=useAuth()
  const navigate=useNavigate()
  useEffect(()=>{api.get('/cart').then(({data})=>setCart(data.cart)).catch(err=>setError(err.userMessage))},[])
  const submit=async e=>{e.preventDefault();setBusy(true);setError('');const payload=Object.fromEntries(new FormData(e.currentTarget));payload.paymentMethod=paymentMethod;try{const {data}=await api.post('/orders',payload);setCartCount(0);navigate(`/order-confirmation/${data.order.orderId}`,{state:{order:data.order}})}catch(err){setError(err.userMessage)}finally{setBusy(false)}}
  if(!cart)return <Loading/>
  if(!cart.items.length)return <section className="content-page"><EmptyState icon={ShoppingCart} title="Your cart is empty" text="Add a medicine before checking out."/><Link className="button button-primary" to="/search">Search medicines</Link></section>
  return <section className="content-page checkout-page"><div className="customer-info"><h2>Customer Information</h2><p><b>Name:</b> {account?.name}</p><p><b>Email:</b> {account?.email}</p></div><div className="checkout-layout"><aside className="order-summary panel"><div className="panel-heading"><div><span className="panel-icon"><ShoppingBag/></span><div><h2>Order Summary</h2><small>{cart.items.length} medicine(s)</small></div></div></div>{cart.items.map(item=><div className="summary-line" key={item.medicine._id}><span>{item.medicine.name}<small>{money(item.medicine.price)} × {item.quantity}</small></span><b>{money(item.lineTotal)}</b></div>)}<div className="summary-total"><span>Total</span><b>{money(cart.total)}</b></div><Link className="quiet-link" to="/dashboard">← Back to Cart</Link></aside><form className="form-card checkout-form" onSubmit={submit}><h2>Shipping &amp; Payment</h2><label>Full Name<input required name="fullName" defaultValue={account?.name}/></label><label>Shipping Address<textarea required name="address" rows="3"/></label><div className="form-row"><label>City<input required name="city"/></label><label>State<input required name="state"/></label></div><div className="form-row"><label>ZIP Code<input required name="zip" inputMode="numeric" pattern="[0-9]{6}" maxLength="6"/></label><label>Phone Number<input required name="phone" inputMode="numeric" pattern="[0-9]{10}" maxLength="10"/></label></div><h2>Payment Method</h2><label className="payment-option"><input type="radio" checked={paymentMethod==='COD'} onChange={()=>setPaymentMethod('COD')}/> <span><Truck/><b>Cash on Delivery</b><small>Pay when the order arrives</small></span></label><label className="payment-option"><input type="radio" checked={paymentMethod==='Card'} onChange={()=>setPaymentMethod('Card')}/> <span><CreditCard/><b>Credit / Debit Card</b><small>Payment authorization is pending gateway setup</small></span></label>{paymentMethod==='Card'&&<Notice tone="warning">Card payment is not processed yet. This order will remain marked as awaiting payment. Card details are never collected or stored here.</Notice>}{error&&<Notice tone="error">{error}</Notice>}<button className="button button-primary button-wide" disabled={busy}>{busy?'Placing order…':'Place Order'} <ArrowRight size={16}/></button></form></div></section>
}

function OrderConfirmation(){const {orderId}=useParams();const {state}=useLocation();return <section className="confirmation-page"><span className="confirmation-icon"><CheckCircle2/></span><div className="eyebrow dark-eyebrow">ORDER RECEIVED</div><h1>Thank you for your order.</h1><p>Your order <b>{orderId}</b> has been placed. You can check its current status in your order history.</p><div className="confirmation-meta"><span>Order ID<b>{orderId}</b></span><span>Amount<b>{money(state?.order?.totalAmount)}</b></span><span>Status<b>{state?.order?.status||'Processing'}</b></span></div><div className="button-row"><Link className="button button-primary" to={`/orders/${orderId}`}>Track order <ArrowRight size={16}/></Link><Link className="button button-secondary" to="/dashboard">Back to dashboard</Link></div></section>}

function OrderHistory(){const [orders,setOrders]=useState([]);const[error,setError]=useState('');useEffect(()=>{api.get('/orders').then(({data})=>setOrders(data.orders)).catch(err=>setError(err.userMessage))},[]);return <section className="content-page"><PageTitle eyebrow="YOUR PURCHASES" title="Order history" subtitle="Review previous orders and follow their delivery status."/>{error&&<Notice tone="error">{error}</Notice>}{orders.length?<div className="table-wrap"><table><thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Amount</th><th>Status</th><th/></tr></thead><tbody>{orders.map(order=><tr key={order._id}><td><b>{order.orderId}</b></td><td>{date(order.createdAt)}</td><td>{order.items.length}</td><td>{money(order.totalAmount)}</td><td><span className="status-pill">{order.status}</span></td><td><Link className="table-link" to={`/orders/${order.orderId}`}>View details <ArrowRight size={14}/></Link></td></tr>)}</tbody></table></div>:<EmptyState icon={PackageCheck} title="No orders yet" text="Once you place an order, you can track it here."/>}</section>}

function OrderTracking(){const {orderId}=useParams();const [order,setOrder]=useState(null);const [error,setError]=useState('');useEffect(()=>{api.get(`/orders/${encodeURIComponent(orderId)}`).then(({data})=>setOrder(data.order)).catch(err=>setError(err.userMessage))},[orderId]);if(error)return <section className="content-page"><Notice tone="error">{error}</Notice></section>;if(!order)return <Loading/>;const stages=['Processing','Shipped','Delivered'];const active=order.status==='Cancelled'?-1:stages.indexOf(order.status);return <section className="content-page"><PageTitle eyebrow="ORDER TRACKING" title={`Order ${order.orderId}`} subtitle={`Placed on ${date(order.createdAt)} · Status: ${order.status}`}/><div className="panel tracking-panel"><div className="tracking-steps">{stages.map((stage,index)=><div className={index<=active?'tracking-step active':'tracking-step'} key={stage}><span>{index<active?<CheckCircle2/>:index===0?<ShoppingBag/>:index===1?<Box/>:<Home/>}</span><b>{stage==='Processing'?'Order placed':stage}</b></div>)}</div>{order.status==='Cancelled'&&<Notice tone="warning">This order was cancelled.</Notice>}<div className="order-detail-grid"><div><h3>Shipping information</h3><p>{order.fullName}<br/>{order.address}<br/>{order.city}, {order.state} {order.zip}<br/>{order.phone}</p></div><div><h3>Payment information</h3><p>Method: {order.paymentMethod}<br/>Payment status: {order.paymentStatus}<br/>Total: {money(order.totalAmount)}</p></div></div><h3>Order items</h3>{order.items.map((item,i)=><div className="summary-line" key={`${item.medicineName}-${i}`}><span>{item.medicineName}<small>Quantity: {item.quantity}</small></span><b>{money(item.price*item.quantity)}</b></div>)}</div><Link className="button button-secondary back-button" to="/orders"><ArrowLeft size={16}/> Back to order history</Link></section>}

function StoreDashboard(){const {account}=useAuth();const [medicines,setMedicines]=useState([]);const [error,setError]=useState('');const [success,setSuccess]=useState('');const [editing,setEditing]=useState(null);const load=()=>api.get('/medicines/mine').then(({data})=>setMedicines(data.medicines)).catch(err=>setError(err.userMessage));useEffect(()=>{load()},[]);const save=async e=>{e.preventDefault();const form=e.currentTarget;const data=Object.fromEntries(new FormData(form));data.price=Number(data.price);data.stock=Number(data.stock);try{if(editing)await api.patch(`/medicines/${editing._id}`,data);else await api.post('/medicines',data);setSuccess(editing?'Medicine details updated.':'Medicine added to your store catalog.');setError('');setEditing(null);form.reset();load()}catch(err){setError(err.userMessage)}};const remove=async item=>{if(!window.confirm(`Remove ${item.name} from your catalog?`))return;try{await api.delete(`/medicines/${item._id}`);load()}catch(err){setError(err.userMessage)}};return <section className="content-page store-dashboard"><PageTitle eyebrow="" title="Welcome to Know Your Medicine" subtitle=""/><div className="store-welcome"><h2>Welcome, {account?.name||'Store'}!</h2><p>Manage your store and products, and view your sales analytics.</p></div><div className="store-add-heading"><h2>Add New Medicine</h2><form key={editing?._id||'new'} className="form-card" onSubmit={save}><h3>{editing?'Edit medicine':'Add medicine details'}</h3>{[['name','Medicine name','text'],['price','Price (₹)','number'],['stock','Available stock','number'],['dosage','Dosage','text'],['description','Description','textarea'],['benefits','Benefits','textarea'],['sideEffects','Side effects','textarea']].map(([name,label,type])=><label key={name}>{label}{type==='textarea'?<textarea name={name} rows="3" defaultValue={editing?.[name]||''}/>:<input name={name} type={type} min={type==='number'?0:undefined} step={name==='price'?'0.01':undefined} defaultValue={editing?.[name]??''} required={['name','price'].includes(name)}/>}</label>)}{error&&<Notice tone="error">{error}</Notice>}{success&&<Notice tone="success">{success}</Notice>}<div className="button-row"><button className="button button-primary">{editing?'Save changes':'Add Medicine'} <Plus size={16}/></button>{editing&&<button type="button" className="button button-secondary" onClick={()=>setEditing(null)}>Cancel</button>}</div></form></div><section className="panel store-listings"><div className="panel-heading"><div><span className="panel-icon"><Store/></span><div><h2>Your medicines</h2><small>{medicines.length} listing(s)</small></div></div></div>{medicines.length?medicines.map(item=><div className="admin-list-row" key={item._id}><span className="medicine-icon"><Pill/></span><span className="admin-list-info"><b>{item.name}</b><small>{money(item.price)} · {item.stock} in stock</small></span><button className="quiet-button" onClick={()=>setEditing(item)}>Edit</button><button className="icon-action danger" onClick={()=>remove(item)} aria-label="Remove medicine"><Trash2 size={17}/></button></div>):<EmptyState icon={Pill} title="No listings yet" text="Add medicines using the form."/>}</section></section>}

function AdminDashboard(){const [overview,setOverview]=useState(null);const[tab,setTab]=useState('overview');const[data,setData]=useState([]);const[error,setError]=useState('');const load=()=>api.get('/admin/overview').then(({data})=>setOverview(data)).catch(err=>setError(err.userMessage));useEffect(()=>{load()},[]);useEffect(()=>{const endpoints={users:'/admin/users',stores:'/admin/stores',medicines:'/admin/medicines',orders:'/admin/orders'};if(endpoints[tab])api.get(endpoints[tab]).then(({data:result})=>setData(result[tab])).catch(err=>setError(err.userMessage))},[tab]);const updateStatus=async(order,status)=>{try{await api.patch(`/admin/orders/${order._id}/status`,{status});setData(rows=>rows.map(row=>row._id===order._id?{...row,status}:row));load()}catch(err){setError(err.userMessage)}};const deleteUser=async user=>{if(!window.confirm(`Remove account for ${user.fullName}?`))return;try{await api.delete(`/admin/users/${user._id}`);setData(rows=>rows.filter(row=>row._id!==user._id));load()}catch(err){setError(err.userMessage)}};const tabs=['overview','users','stores','medicines','orders'];return <section className="content-page"><PageTitle eyebrow="ADMINISTRATION" title="Admin dashboard" subtitle="Review platform activity, store registrations, medicine listings, and orders."/>{error&&<Notice tone="error">{error}</Notice>}<div className="admin-tabs">{tabs.map(name=><button className={tab===name?'selected':''} onClick={()=>setTab(name)} key={name}>{name[0].toUpperCase()+name.slice(1)}</button>)}</div>{tab==='overview'?<>{overview?<div className="stats-grid">{[['Users',overview.stats.users,Users],['Stores',overview.stats.stores,Store],['Medicines',overview.stats.medicines,Pill],['Orders',overview.stats.orders,ShoppingBag]].map(([label,value,Icon])=><div className="stat-card" key={label}><span><Icon/></span><small>{label}</small><b>{value}</b></div>)}</div>:<Loading/>}<h2 className="subheading">Recent orders</h2><div className="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Amount</th><th>Status</th><th>Date</th><th/></tr></thead><tbody>{overview?.recentOrders?.map(order=><tr key={order._id}><td>{order.orderId}</td><td>{order.fullName}</td><td>{money(order.totalAmount)}</td><td>{order.status}</td><td>{date(order.createdAt)}</td><td><select value={order.status} onChange={e=>updateStatus(order,e.target.value)}>{['Processing','Shipped','Delivered','Cancelled'].map(status=><option key={status}>{status}</option>)}</select></td></tr>)}</tbody></table></div></>:<>{tab==='medicines'&&<AdminMedicineForm onCreated={()=>api.get('/admin/medicines').then(({data:result})=>setData(result.medicines)).then(load)}/>}<AdminDataTable tab={tab} data={data} onDelete={deleteUser} onStatus={updateStatus}/></> }</section>}


function AdminMedicineForm({onCreated}) {
  const [error,setError]=useState('')
  const [success,setSuccess]=useState('')
  const submit=async event=>{event.preventDefault();const form=event.currentTarget;const payload=Object.fromEntries(new FormData(form));payload.price=Number(payload.price);payload.stock=Number(payload.stock||0);try{await api.post('/medicines',payload);form.reset();setError('');setSuccess('Medicine added to the public catalog.');onCreated()}catch(err){setSuccess('');setError(err.userMessage)}}
  return <form className="form-card admin-medicine-form" onSubmit={submit}><h2>Add a medicine to the catalog</h2><div className="form-row"><label>Name<input name="name" required/></label><label>Price (₹)<input name="price" type="number" min="0" step="0.01" required/></label><label>Stock<input name="stock" type="number" min="0" defaultValue="0"/></label></div><label>Description<textarea name="description" rows="2"/></label><div className="form-row"><label>Dosage information<input name="dosage"/></label><label>Benefits<input name="benefits"/></label><label>Side effects<input name="sideEffects"/></label></div>{error&&<Notice tone="error">{error}</Notice>}{success&&<Notice tone="success">{success}</Notice>}<button className="button button-primary">Add medicine <Plus size={16}/></button></form>
}

function AdminDataTable({tab,data,onDelete,onStatus}){if(!data.length)return <EmptyState icon={Database} title={`No ${tab} to show`} text="New data will appear here as accounts register and orders are placed."/>;return <div className="table-wrap"><table><thead><tr>{(tab==='users'?['Name','Email','Joined','']:tab==='stores'?['Store','Email','Location','Contact']:tab==='medicines'?['Medicine','Price','Stock','Store']:['Order','Customer','Amount','Date','Status','Update']).map((h,i)=><th key={`${h}-${i}`}>{h}</th>)}</tr></thead><tbody>{data.map(item=><tr key={item._id}>{tab==='users'?<><td>{item.fullName}</td><td>{item.email}</td><td>{date(item.createdAt)}</td><td><button className="quiet-button danger-text" onClick={()=>onDelete(item)}>Remove</button></td></>:tab==='stores'?<><td>{item.storeName}</td><td>{item.email}</td><td>{item.location}</td><td>{item.contactNumber}</td></>:tab==='medicines'?<><td>{item.name}</td><td>{money(item.price)}</td><td>{item.stock}</td><td>{item.store?.storeName||'Admin catalog'}</td></>:<><td>{item.orderId}</td><td>{item.fullName}</td><td>{money(item.totalAmount)}</td><td>{date(item.createdAt)}</td><td>{item.status}</td><td><select value={item.status} onChange={e=>onStatus(item,e.target.value)}>{['Processing','Shipped','Delivered','Cancelled'].map(status=><option key={status}>{status}</option>)}</select></td></>}</tr>)}</tbody></table></div>}

function PageTitle({eyebrow,title,subtitle,showActions=true}){const{account,setAccount}=useAuth();const navigate=useNavigate();const logout=async()=>{await api.post('/auth/logout').catch(()=>{});setAccount(null);navigate('/')};return <div className="page-title">{eyebrow&&<div className="eyebrow dark-eyebrow">{eyebrow}</div>}<h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}{showActions&&<div className="page-title-actions"><Link to="/">⌂ Home</Link>{account&&<button onClick={logout}><LogOut size={14}/> Logout</button>}</div>}</div>}
function Notice({tone='error',children}){return <div className={`notice notice-${tone}`} role="status">{tone==='success'?<CheckCircle2/>:tone==='warning'?<CircleHelp/>:<X/>}<span>{children}</span></div>}
function EmptyState({icon:Icon,title,text}){return <div className="empty-state"><span><Icon/></span><b>{title}</b><p>{text}</p></div>}
function Loading(){return <div className="loading-state"><span className="spinner"/><span>Loading…</span></div>}
function ErrorPage(){return <section className="content-page narrow"><PageTitle eyebrow="OOPS" title="We couldn't load that page" subtitle="Please return to the medicine catalog and try again."/><Link className="button button-primary" to="/">Back to home <ArrowRight size={16}/></Link></section>}

export default App
