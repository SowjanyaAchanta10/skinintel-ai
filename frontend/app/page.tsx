'use client';
import {useState} from 'react';
import {ArrowRight,BrainCircuit,CheckCircle2,ChevronRight,Eye,FlaskConical,LockKeyhole,LogIn,Mail,Menu,Sparkles,ShieldCheck,UserPlus,X,Zap} from 'lucide-react';
type Mode='login'|'signup';
export default function Home(){const[mode,setMode]=useState<Mode>('signup');const[open,setOpen]=useState(false);const[name,setName]=useState('');const[email,setEmail]=useState('');const[pw,setPw]=useState('');const[error,setError]=useState('');
function submit(e:React.FormEvent){e.preventDefault();setError('');const em=email.trim().toLowerCase();if(!em||!pw)return setError('Please enter email and password.');if(pw.length<6)return setError('Password must contain at least 6 characters.');const users=JSON.parse(localStorage.getItem('skinintel_users')||'[]') as any[];if(mode==='signup'){if(!name.trim())return setError('Please enter your name.');if(users.some(u=>u.email===em))return(setMode('login'),setError('Account already exists. Please log in.'));users.push({name:name.trim(),email:em,password:pw});localStorage.setItem('skinintel_users',JSON.stringify(users));localStorage.setItem('skinintel_user',JSON.stringify({name:name.trim(),email:em}));location.href='/scan'}else{const u=users.find(x=>x.email===em&&x.password===pw);if(!u)return setError('Incorrect email or password.');localStorage.setItem('skinintel_user',JSON.stringify({name:u.name,email:u.email}));location.href='/dashboard'}}
const auth=(m:Mode)=>{setMode(m);setError('');setOpen(true)};return <main className="site"><header className="header"><a className="brand" href="/"><span className="mark"><Sparkles size={19}/></span><span><b>SKININTEL</b><small>DERMATOLOGY AI</small></span></a><nav><a href="#technology">Technology</a><a href="#workflow">How it works</a><a href="#safety">Responsible AI</a><button className="link-btn" onClick={()=>auth('login')}><LogIn size={15}/>Login</button><button className="nav-cta" onClick={()=>auth('signup')}>Get started <ArrowRight size={15}/></button></nav><button className="mobile-nav" onClick={()=>document.body.classList.toggle('nav-open')}><Menu/></button></header>
<section className="hero"><div className="hero-copy"><div className="eyebrow"><i/>AI-POWERED SKIN INTELLIGENCE</div><h1>Understand your skin<br/><em>Care for it smarter</em></h1><p>SkinIntel combines computer vision, multi-task deep learning and intelligent cosmetic matching to turn a skin image into a clear educational skin report.</p><div className="hero-actions"><button className="primary" onClick={()=>auth('signup')}>Start your skin scan <ArrowRight size={17}/></button><a className="secondary" href="#workflow">Explore the platform <ChevronRight size={17}/></a></div><div className="trust"><span><ShieldCheck size={15}/>Educational AI support</span><span><LockKeyhole size={14}/>Privacy-first demo</span><span><Zap size={14}/>Fast analysis</span></div></div><div className="hero-visual"><div className="orbit a"/><div className="orbit b"/><div className="vision-card"><div className="vision-top"><span>SkinIntel VISION ENGINE</span><b><i/> LIVE</b></div><div className="scan-face"><div className="face"><Eye size={42}/><span>SKIN SCAN</span></div><div className="scanline"/><u/><u/><u/><u/></div><div className="vision-stats"><div><small>PROFILE</small><b>AI READY</b></div><div><small>MODULES</small><b>20+</b></div><div><small>OUTPUT</small><b>PERSONAL</b></div></div></div></div></section>
<section className="stats"><div><b>4</b><span>Skin type classes</span></div><div><b>18</b><span>Concern dimensions</span></div><div><b>Multi-task</b><span>Deep learning model</span></div><div><b>AI + GAN</b><span>Reference generation</span></div></section>
<section id="technology" className="section"><div className="heading"><span>THE SKININTEL PLATFORM</span><h2>One scan. A complete skin intelligence report.</h2><p>Designed as a modern digital dermatology experience for analysis, education and cosmetic discovery.</p></div><div className="features"><article><div className="icon mint"><BrainCircuit/></div><h3>AI Skin Profiling</h3><p>Predicts normal, oily, dry and combination skin using a trained multi-task CNN.</p><b>Computer vision </b></article><article><div className="icon violet"><FlaskConical/></div><h3>18 Concern Signals</h3><p>Estimates concern severity across acne, pores, dehydration, pigmentation and more.</p><b>Detailed insights </b></article><article><div className="icon blue"><Sparkles/></div><h3>Smart Matching</h3><p>Ranks cosmetic options using skin-type compatibility, concern relevance and ingredient signals.</p><b>Personalized discovery </b></article></div></section>
<section id="workflow" className="section workflow"><div className="heading"><span>HOW IT WORKS</span><h2>From image to insight in three steps.</h2></div><div className="steps"><article><b>01</b><div><h3>Create your profile</h3><p>Sign up and access your AI workspace.</p></div></article><article><b>02</b><div><h3>Upload a clear image</h3><p>SkinIntel processes the image through the trained vision model.</p></div></article><article><b>03</b><div><h3>Explore your report</h3><p>Review probabilities, concerns and cosmetic matches.</p></div></article></div></section>
<section id="safety" className="safety"><ShieldCheck size={23}/><div><b>Responsible AI by design</b><p>SKININTEL is an educational skin-analysis project, not a medical diagnosis. Results should not replace professional dermatological advice.</p></div></section>
<footer className="footer">
  <div className="footer-main">

    {/* Brand */}
    <div className="footer-brand">
      <a className="brand" href="/">
        <span className="mark">
          <Sparkles size={17} />
        </span>

        <span>
          <b>SKININTEL</b>
          <small>SKIN INTELLIGENCE</small>
        </span>
      </a>

      <p className="footer-tagline">
        AI-powered skin intelligence for healthier, more confident you.
      </p>

      <p className="footer-description">
        Combining computer vision, multi-task learning and responsible AI
        to make skin analysis accessible to everyone.
      </p>

      

      <p className="footer-motto">
        Science for healthier skin.
      </p>
    </div>

    {/* Product */}
    <div className="footer-column">
      <h4>Product</h4>
      <a href="/scan">Skin Analysis</a>
      <a href="/scan-history">Scan History</a>
      <a href="/model-insights">Model Insights</a>
      <a href="/scan">Get Started</a>
    </div>

    {/* Resources */}
    <div className="footer-column">
      <h4>Resources</h4>
      <a href="#technology">Skin Care Guide</a>
      <a href="#workflow">How It Works</a>
      
     
    </div>

    {/* Company */}
    <div className="footer-column">
      <h4>Company</h4>
      <a href="/">About SKININTEL</a>
     
    </div>

   

  </div>

  <div className="footer-bottom">
    <span>© 2026 SkinIntel Dermatology AI. All rights reserved.</span>

    <span>
      Built with ❤️ for healthier skin.
      
    </span>
  </div>
</footer>
{open&&<div className="modal" onMouseDown={e=>e.target===e.currentTarget&&setOpen(false)}><div className="auth"><button className="close" onClick={()=>setOpen(false)}><X/></button><div className="auth-brand"><span className="mark"><Sparkles size={18}/></span><b>SkinIntel</b></div><span className="auth-kicker">{mode==='signup'?'CREATE ACCOUNT':'WELCOME BACK'}</span><h2>{mode==='signup'?'Start your skin journey.':'Continue your skin journey.'}</h2><p>{mode==='signup'?'Create your demo account to access your AI workspace.':'Log in with your registered details.'}</p><form onSubmit={submit}>{mode==='signup'&&<label>Full name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/></label>}<label>Email<div className="input"><Mail size={16}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></div></label><label>Password<div className="input"><LockKeyhole size={16}/><input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="Minimum 6 characters"/></div></label>{error&&<div className="auth-error">{error}</div>}<button className="primary auth-submit">{mode==='signup'?<><UserPlus size={17}/>Create account</>:<><LogIn size={17}/>Login</>}</button></form><div className="switch">{mode==='signup'?'Already registered?':'New to SkinIntel?'} <button onClick={()=>{setMode(mode==='signup'?'login':'signup');setError('')}}>{mode==='signup'?'Log in':'Create account'}</button></div><small>Demo authentication is stored locally in your browser for this academic project.</small></div></div>}</main>}
