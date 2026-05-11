import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://ntrokpxjplmhutmgpfqj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50cm9rcHhqcGxtaHV0bWdwZnFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzODAwMDUsImV4cCI6MjA2MTk1NjAwNX0.r4L0qFKO5QC2xAAwOCwiZXhwIjoyMDYxOTU2MDA1fQ'
)

const COLORS = ['#2d5a3d','#7F77DD','#D85A30','#378ADD','#D4537E','#1D9E75']
const STATUS = { pending:'في الانتظار', review:'تحت المراجعة', approved:'موافق', rejected:'مرفوض' }

function initials(name) {
  if (!name) return '?'
  const p = name.trim().split(' ')
  return p.length >= 2 ? p[0][0] + p[1][0] : name.slice(0, 2)
}

function getColor(i) { return COLORS[Math.abs(i) % COLORS.length] }

function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setErr('')
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass })
    if (error) { setErr('بريد أو كلمة سر غلط: ' + error.message); setLoading(false); return }
    onLogin(data.user)
    setLoading(false)
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px',background:'#f5f4f0',fontFamily:'Cairo,sans-serif',direction:'rtl'}}>
      <div style={{background:'#fff',border:'1.5px solid #e2e0d8',borderRadius:'20px',padding:'40px 36px',width:'100%',maxWidth:'400px'}}>
        <div style={{width:'48px',height:'48px',background:'#2d5a3d',borderRadius:'14px',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'20px'}}>
          <span style={{color:'#fff',fontSize:'22px',fontWeight:'700'}}>ع</span>
        </div>
        <h1 style={{fontSize:'22px',fontWeight:'700',marginBottom:'4px'}}>نظام العوارض</h1>
        <p style={{fontSize:'14px',color:'#6b6a63',marginBottom:'28px'}}>سجّل دخولك بالبيانات اللي أعطاكها المدير</p>
        {err && <div style={{fontSize:'13px',color:'#8b2020',background:'#fdeaea',borderRadius:'8px',padding:'10px 12px',marginBottom:'16px'}}>{err}</div>}
        <form onSubmit={submit}>
          <div style={{marginBottom:'16px'}}>
            <label style={{display:'block',fontSize:'13px',fontWeight:'500',color:'#6b6a63',marginBottom:'6px'}}>البريد الإلكتروني</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@company.com" required
              style={{fontFamily:'Cairo,sans-serif',fontSize:'14px',color:'#1a1a18',background:'#fff',border:'1.5px solid #e2e0d8',borderRadius:'8px',padding:'9px 12px',width:'100%',outline:'none',direction:'rtl'}} />
          </div>
          <div style={{marginBottom:'16px'}}>
            <label style={{display:'block',fontSize:'13px',fontWeight:'500',color:'#6b6a63',marginBottom:'6px'}}>كلمة السر</label>
            <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" required
              style={{fontFamily:'Cairo,sans-serif',fontSize:'14px',color:'#1a1a18',background:'#fff',border:'1.5px solid #e2e0d8',borderRadius:'8px',padding:'9px 12px',width:'100%',outline:'none',direction:'rtl'}} />
          </div>
          <button type="submit" disabled={loading}
            style={{width:'100%',padding:'11px',background:'#2d5a3d',color:'#fff',border:'none',borderRadius:'8px',fontSize:'15px',fontWeight:'600',cursor:'pointer',fontFamily:'Cairo,sans-serif'}}>
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [leads, setLeads] = useState([])
  const [profiles, setProfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [newLead, setNewLead] = useState({name:'',phone:'',notes:''})
  const [editingId, setEditingId] = useState(null)
  const [editData, setEditData] = useState({status:'',note:''})
  const [page, setPage] = useState('leads')
  const [users, setUsers] = useState([])
  const [newUser, setNewUser] = useState({name:'',email:'',pass:'',role:'agent'})
  const [userMsg, setUserMsg] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({data:{session}}) => {
      if (session?.user) loadUser(session.user)
      else setLoading(false)
    })
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_,session) => {
      if (session?.user) loadUser(session.user)
      else { setUser(null); setProfile(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadUser(u) {
    setUser(u)
    const {data} = await supabase.from('profiles').select('*').eq('id', u.id).single()
    setProfile(data)
    await loadData()
    setLoading(false)
  }

  async function loadData() {
    const [{data:ld},{data:pd}] = await Promise.all([
      supabase.from('leads').select('*').order('created_at',{ascending:false}),
      supabase.from('profiles').select('*')
    ])
    if (ld) setLeads(ld)
    if (pd) {
      const m = {}
      pd.forEach(p => { m[p.id] = p })
      setProfiles(m)
      setUsers(pd)
    }
  }

  useEffect(() => {
    if (!user) return
    const ch = supabase.channel('leads-rt')
      .on('postgres_changes',{event:'*',schema:'public',table:'leads'},p => {
        if (p.eventType==='INSERT') setLeads(prev=>[p.new,...prev])
        else if (p.eventType==='UPDATE') setLeads(prev=>prev.map(l=>l.id===p.new.id?p.new:l))
        else if (p.eventType==='DELETE') setLeads(prev=>prev.filter(l=>l.id!==p.old.id))
      }).subscribe()
    return () => supabase.removeChannel(ch)
  }, [user])

  async function addLead(e) {
    e.preventDefault()
    const {data,error} = await supabase.from('leads').insert({
      client_name: newLead.name.trim(),
      phone: newLead.phone.trim(),
      notes: newLead.notes.trim(),
      added_by: user.id,
      added_by_name: profile?.full_name || user.email,
      status: 'pending'
    }).select().single()
    if (!error && data) {
      setLeads(p=>[data,...p])
      setNewLead({name:'',phone:'',notes:''})
      setShowAdd(false)
    }
  }

  async function saveCondition(id) {
    await supabase.from('leads').update({
      status: editData.status,
      condition_note: editData.note,
      reviewed_at: new Date().toISOString()
    }).eq('id', id)
    setLeads(p=>p.map(l=>l.id===id?{...l,status:editData.status,condition_note:editData.note}:l))
    setEditingId(null)
  }

  const isAdmin = profile?.role === 'admin'

  const filtered = leads.filter(l => {
    if (!isAdmin && l.added_by !== user?.id) return false
    if (tab === 'all') return true
    return l.status === tab
  })

  const s = { total:leads.length, pending:leads.filter(l=>l.status==='pending').length, approved:leads.filter(l=>l.status==='approved').length, rejected:leads.filter(l=>l.status==='rejected').length }

  if (loading) return <div style={{textAlign:'center',padding:'60px',fontFamily:'Cairo,sans-serif'}}>جاري التحميل...</div>
  if (!user) return <Login onLogin={loadUser} />

  const userIdx = Object.keys(profiles).indexOf(user.id)
  const userColor = getColor(userIdx)

  const S = {
    app: {fontFamily:'Cairo,sans-serif',direction:'rtl',minHeight:'100vh',background:'#f5f4f0'},
    topbar: {background:'#fff',borderBottom:'1.5px solid #e2e0d8',padding:'0 24px',height:'60px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100,gap:'12px'},
    page: {maxWidth:'800px',margin:'0 auto',padding:'28px 24px'},
    card: {background:'#fff',border:'1.5px solid #e2e0d8',borderRadius:'12px',padding:'18px 20px',marginBottom:'10px'},
    btn: (bg,color) => ({background:bg,color:color||'#fff',border:'none',borderRadius:'8px',padding:'8px 16px',fontSize:'13px',fontWeight:'600',cursor:'pointer',fontFamily:'Cairo,sans-serif'}),
    input: {fontFamily:'Cairo,sans-serif',fontSize:'14px',color:'#1a1a18',background:'#fff',border:'1.5px solid #e2e0d8',borderRadius:'8px',padding:'9px 12px',width:'100%',outline:'none',direction:'rtl',marginBottom:'12px'},
    badge: (st) => {
      const c = {pending:['#fdf3e3','#92600a'],review:['#e8eef6','#1a3d6b'],approved:['#e8f0eb','#2d5a3d'],rejected:['#fdeaea','#8b2020']}[st]||['#f0efe9','#6b6a63']
      return {fontSize:'12px',fontWeight:'600',padding:'4px 10px',borderRadius:'20px',background:c[0],color:c[1],whiteSpace:'nowrap'}
    }
  }

  return (
    <div style={S.app}>
      <div style={S.topbar}>
        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
          <div style={{width:'34px',height:'34px',background:'#2d5a3d',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:'700',fontSize:'16px'}}>ع</div>
          <span style={{fontSize:'15px',fontWeight:'700'}}>نظام العوارض</span>
          <span style={{width:'8px',height:'8px',borderRadius:'50%',background:'#22c55e',display:'inline-block'}} />
        </div>

        {isAdmin && (
          <div style={{display:'flex',gap:'4px',background:'#f0efe9',padding:'4px',borderRadius:'8px'}}>
            {[['leads','📋 العوارض'],['admin','👥 الحسابات']].map(([v,l])=>(
              <button key={v} onClick={()=>setPage(v)}
                style={{...S.btn(page===v?'#fff':'transparent', page===v?'#1a1a18':'#6b6a63'),boxShadow:page===v?'0 1px 2px rgba(0,0,0,.08)':'none'}}>
                {l}
              </button>
            ))}
          </div>
        )}

        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px',background:'#f0efe9',border:'1.5px solid #e2e0d8',borderRadius:'30px',padding:'4px 12px 4px 4px'}}>
            <div style={{width:'28px',height:'28px',borderRadius:'50%',background:userColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:'700',color:'#fff'}}>
              {initials(profile?.full_name||user.email)}
            </div>
            <div>
              <div style={{fontSize:'13px',fontWeight:'600'}}>{profile?.full_name||user.email}</div>
              <div style={{fontSize:'11px',color:'#6b6a63'}}>{isAdmin?'مدير':'موظف'}</div>
            </div>
          </div>
          <button onClick={()=>supabase.auth.signOut()} style={S.btn('transparent','#6b6a63')}>خروج</button>
        </div>
      </div>

      <div style={S.page}>
        {page === 'leads' && <>
          {isAdmin && (
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'24px'}}>
              {[['إجمالي',s.total,'#1a1a18'],['انتظار',s.pending,'#92600a'],['موافق',s.approved,'#2d5a3d'],['مرفوض',s.rejected,'#8b2020']].map(([l,n,c])=>(
                <div key={l} style={{background:'#fff',border:'1.5px solid #e2e0d8',borderRadius:'12px',padding:'16px',textAlign:'center'}}>
                  <div style={{fontSize:'26px',fontWeight:'700',color:c,marginBottom:'4px'}}>{n}</div>
                  <div style={{fontSize:'12px',color:'#6b6a63'}}>{l}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px',gap:'12px'}}>
            <div style={{display:'flex',gap:'4px',background:'#f0efe9',padding:'4px',borderRadius:'8px',overflowX:'auto'}}>
              {[['all','الكل'],['pending','انتظار'],['review','مراجعة'],['approved','موافق'],['rejected','مرفوض']].map(([v,l])=>(
                <button key={v} onClick={()=>setTab(v)}
                  style={{...S.btn(tab===v?'#fff':'transparent',tab===v?'#1a1a18':'#6b6a63'),whiteSpace:'nowrap',boxShadow:tab===v?'0 1px 2px rgba(0,0,0,.08)':'none'}}>
                  {l}
                </button>
              ))}
            </div>
            {!isAdmin && <button onClick={()=>setShowAdd(true)} style={S.btn('#2d5a3d')}>+ عارضة جديدة</button>}
          </div>

          {showAdd && !isAdmin && (
            <div style={{...S.card,border:'2px solid #2d5a3d',marginBottom:'12px'}}>
              <div style={{fontSize:'16px',fontWeight:'700',marginBottom:'16px'}}>+ إضافة عارضة جديدة</div>
              <form onSubmit={addLead}>
                <label style={{fontSize:'12px',color:'#6b6a63',display:'block',marginBottom:'4px'}}>اسم العميل *</label>
                <input style={S.input} value={newLead.name} onChange={e=>setNewLead(p=>({...p,name:e.target.value}))} placeholder="الاسم الكامل" required />
                <label style={{fontSize:'12px',color:'#6b6a63',display:'block',marginBottom:'4px'}}>رقم التليفون</label>
                <input style={S.input} value={newLead.phone} onChange={e=>setNewLead(p=>({...p,phone:e.target.value}))} placeholder="01xxxxxxxxx" />
                <label style={{fontSize:'12px',color:'#6b6a63',display:'block',marginBottom:'4px'}}>ملاحظات</label>
                <textarea style={{...S.input,minHeight:'80px',resize:'vertical'}} value={newLead.notes} onChange={e=>setNewLead(p=>({...p,notes:e.target.value}))} placeholder="اكتب ملاحظاتك..." />
                <div style={{display:'flex',gap:'8px'}}>
                  <button type="submit" style={{...S.btn('#2d5a3d'),flex:1}}>حفظ</button>
                  <button type="button" onClick={()=>setShowAdd(false)} style={S.btn('transparent','#6b6a63')}>إلغاء</button>
                </div>
              </form>
            </div>
          )}

          {filtered.length === 0 ? (
            <div style={{textAlign:'center',padding:'60px',color:'#9e9d96'}}>
              <div style={{fontSize:'40px',marginBottom:'12px'}}>📋</div>
              <div>مفيش عوارض هنا</div>
            </div>
          ) : filtered.map(lead => {
            const ownerIdx = Object.keys(profiles).indexOf(lead.added_by)
            const ownerColor = getColor(ownerIdx)
            const ownerName = lead.added_by_name || profiles[lead.added_by]?.full_name || 'موظف'
            const date = new Date(lead.created_at).toLocaleDateString('ar-EG',{day:'numeric',month:'short',year:'numeric'})
            const isEditing = editingId === lead.id

            return (
              <div key={lead.id} style={S.card}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'10px'}}>
                  <div>
                    <div style={{fontSize:'16px',fontWeight:'700'}}>{lead.client_name}</div>
                    {lead.phone && <div style={{fontSize:'13px',color:'#6b6a63',marginTop:'2px',direction:'ltr',textAlign:'right'}}>{lead.phone}</div>}
                  </div>
                  <span style={S.badge(lead.status)}>{STATUS[lead.status]}</span>
                </div>
                {lead.notes && <div style={{fontSize:'13px',color:'#6b6a63',marginBottom:'10px'}}>{lead.notes}</div>}
                <div style={{display:'flex',alignItems:'center',gap:'8px',fontSize:'12px',color:'#9e9d96'}}>
                  <span style={{width:'8px',height:'8px',borderRadius:'50%',background:ownerColor,display:'inline-block'}} />
                  <span>أضافه {ownerName}</span>
                  <span>·</span>
                  <span>{date}</span>
                </div>
                {lead.condition_note && (
                  <div style={{marginTop:'12px',padding:'12px 14px',background:'#e8f0eb',borderRadius:'8px',borderRight:'3px solid #2d5a3d'}}>
                    <div style={{fontSize:'11px',fontWeight:'600',color:'#2d5a3d',marginBottom:'4px'}}>شرط المدير</div>
                    <div style={{fontSize:'13px'}}>{lead.condition_note}</div>
                  </div>
                )}
                {isAdmin && (isEditing ? (
                  <div style={{marginTop:'14px',padding:'16px',background:'#f0efe9',borderRadius:'8px',border:'1.5px solid #e2e0d8'}}>
                    <label style={{fontSize:'12px',color:'#6b6a63',display:'block',marginBottom:'6px'}}>الحالة</label>
                    <select style={{...S.input}} value={editData.status} onChange={e=>setEditData(p=>({...p,status:e.target.value}))}>
                      <option value="pending">في الانتظار</option>
                      <option value="review">تحت المراجعة</option>
                      <option value="approved">موافق</option>
                      <option value="rejected">مرفوض</option>
                    </select>
                    <label style={{fontSize:'12px',color:'#6b6a63',display:'block',marginBottom:'6px'}}>الشرط</label>
                    <textarea style={{...S.input,minHeight:'70px'}} value={editData.note} onChange={e=>setEditData(p=>({...p,note:e.target.value}))} placeholder="اكتب الشرط هنا..." />
                    <div style={{display:'flex',gap:'8px'}}>
                      <button onClick={()=>saveCondition(lead.id)} style={S.btn('#2d5a3d')}>حفظ</button>
                      <button onClick={()=>setEditingId(null)} style={S.btn('transparent','#6b6a63')}>إلغاء</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={()=>{setEditingId(lead.id);setEditData({status:lead.status,note:lead.condition_note||''})}}
                    style={{marginTop:'12px',width:'100%',padding:'8px',border:'1.5px dashed #e2e0d8',borderRadius:'8px',background:'transparent',color:'#9e9d96',fontSize:'13px',cursor:'pointer',fontFamily:'Cairo,sans-serif'}}>
                    {lead.condition_note ? '✏️ تعديل الشرط' : '+ إضافة شرط أو تغيير الحالة'}
                  </button>
                ))}
              </div>
            )
          })}
        </>}

        {page === 'admin' && isAdmin && (
          <div>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'20px'}}>
              <div>
                <div style={{fontSize:'20px',fontWeight:'700'}}>إدارة الحسابات</div>
                <div style={{fontSize:'13px',color:'#6b6a63',marginTop:'2px'}}>انت اللي بتتحكم في كل الحسابات</div>
              </div>
              <button onClick={()=>setShowAdd(true)} style={S.btn('#2d5a3d')}>+ حساب جديد</button>
            </div>

            {userMsg && <div style={{fontSize:'13px',color:'#2d5a3d',background:'#e8f0eb',borderRadius:'8px',padding:'10px 12px',marginBottom:'16px'}}>{userMsg}</div>}

            {showAdd && page==='admin' && (
              <div style={{...S.card,border:'2px solid #2d5a3d',marginBottom:'16px'}}>
                <div style={{fontSize:'16px',fontWeight:'700',marginBottom:'16px'}}>إنشاء حساب جديد</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                  <div>
                    <label style={{fontSize:'12px',color:'#6b6a63',display:'block',marginBottom:'4px'}}>الاسم</label>
                    <input style={S.input} value={newUser.name} onChange={e=>setNewUser(p=>({...p,name:e.target.value}))} placeholder="أحمد محمد" />
                  </div>
                  <div>
                    <label style={{fontSize:'12px',color:'#6b6a63',display:'block',marginBottom:'4px'}}>الدور</label>
                    <select style={S.input} value={newUser.role} onChange={e=>setNewUser(p=>({...p,role:e.target.value}))}>
                      <option value="agent">موظف</option>
                      <option value="admin">مدير</option>
                    </select>
                  </div>
                </div>
                <label style={{fontSize:'12px',color:'#6b6a63',display:'block',marginBottom:'4px'}}>الإيميل</label>
                <input style={S.input} type="email" value={newUser.email} onChange={e=>setNewUser(p=>({...p,email:e.target.value}))} placeholder="name@company.com" />
                <label style={{fontSize:'12px',color:'#6b6a63',display:'block',marginBottom:'4px'}}>كلمة السر</label>
                <input style={S.input} type="password" value={newUser.pass} onChange={e=>setNewUser(p=>({...p,pass:e.target.value}))} placeholder="8 أحرف على الأقل" />
                <div style={{display:'flex',gap:'8px'}}>
                  <button style={{...S.btn('#2d5a3d'),flex:1}} onClick={async()=>{
                    const {data:{session}} = await supabase.auth.getSession()
                    const res = await fetch(`https://ntrokpxjplmhutmgpfqj.supabase.co/functions/v1/create-user`,{
                      method:'POST',
                      headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`,'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50cm9rcHhqcGxtaHV0bWdwZnFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzODAwMDUsImV4cCI6MjA2MTk1NjAwNX0.r4L0qFKO5QC2xAAwOCwiZXhwIjoyMDYxOTU2MDA1fQ'},
                      body:JSON.stringify({full_name:newUser.name,email:newUser.email,password:newUser.pass,role:newUser.role})
                    })
                    const r = await res.json()
                    if (r.error) { setUserMsg('خطأ: '+r.error) }
                    else { setUserMsg('تم إنشاء الحساب ✅'); setNewUser({name:'',email:'',pass:'',role:'agent'}); setShowAdd(false); await loadData(); setTimeout(()=>setUserMsg(''),4000) }
                  }}>إنشاء</button>
                  <button onClick={()=>setShowAdd(false)} style={S.btn('transparent','#6b6a63')}>إلغاء</button>
                </div>
              </div>
            )}

            <div style={{background:'#fff',border:'1.5px solid #e2e0d8',borderRadius:'12px',overflow:'hidden'}}>
              <div style={{padding:'12px 20px',fontSize:'12px',fontWeight:'600',color:'#6b6a63',borderBottom:'1.5px solid #e2e0d8',background:'#f0efe9'}}>{users.length} حساب مسجّل</div>
              {users.map((u,i)=>(
                <div key={u.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px',borderBottom:'1px solid #e2e0d8'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                    <div style={{width:'34px',height:'34px',borderRadius:'50%',background:getColor(i),display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',fontWeight:'700',color:'#fff'}}>{initials(u.full_name)}</div>
                    <div>
                      <div style={{fontSize:'15px',fontWeight:'600',display:'flex',alignItems:'center',gap:'8px'}}>
                        {u.full_name}
                        {u.id===user.id && <span style={{fontSize:'11px',background:'#e8eef6',color:'#1a3d6b',padding:'2px 8px',borderRadius:'10px'}}>أنا</span>}
                      </div>
                      <div style={{fontSize:'12px',color:'#9e9d96'}}>{new Date(u.created_at).toLocaleDateString('ar-EG',{day:'numeric',month:'long',year:'numeric'})}</div>
                    </div>
                  </div>
                  {u.id===user.id ? (
                    <span style={{fontSize:'12px',fontWeight:'600',padding:'4px 12px',borderRadius:'20px',background:'#e8f0eb',color:'#2d5a3d'}}>{u.role==='admin'?'مدير':'موظف'}</span>
                  ) : (
                    <select style={{fontFamily:'Cairo,sans-serif',fontSize:'13px',padding:'6px 10px',borderRadius:'8px',border:'1.5px solid #e2e0d8',cursor:'pointer'}}
                      value={u.role} onChange={async e=>{
                        await supabase.from('profiles').update({role:e.target.value}).eq('id',u.id)
                        await loadData()
                      }}>
                      <option value="agent">موظف</option>
                      <option value="admin">مدير</option>
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
