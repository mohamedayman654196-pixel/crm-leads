import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

const COLORS = ['#2d5a3d','#7F77DD','#D85A30','#378ADD','#D4537E','#1D9E75']
const STATUS = { pending:'في الانتظار', review:'تحت المراجعة', approved:'موافق', rejected:'مرفوض' }

function initials(name) {
  if (!name) return '?'
  const p = name.trim().split(' ')
  return p.length >= 2 ? p[0][0] + p[1][0] : name.slice(0, 2)
}

function color(i) { return COLORS[Math.abs(i) % COLORS.length] }

// ========== LOGIN ==========
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
    if (error) { setErr('بريد أو كلمة سر غلط'); setLoading(false); return }
    onLogin(data.user)
    setLoading(false)
  }

  return (
    <div className="login-wrap">
      <div className="login-box">
        <div className="login-logo"><span>ع</span></div>
        <h1>نظام العوارض</h1>
        <p>سجّل دخولك بالبيانات اللي أعطاكها المدير</p>
        {err && <div className="err">{err}</div>}
        <form onSubmit={submit}>
          <div className="fg">
            <label>البريد الإلكتروني</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" required />
          </div>
          <div className="fg">
            <label>كلمة السر</label>
            <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" required />
          </div>
          <button className="btn-main" disabled={loading}>{loading ? 'جاري الدخول...' : 'دخول'}</button>
        </form>
      </div>
    </div>
  )
}

// ========== LEAD CARD ==========
function LeadCard({ lead, isAdmin, profileMap }) {
  const [editing, setEditing] = useState(false)
  const [status, setStatus] = useState(lead.status)
  const [note, setNote] = useState(lead.condition_note || '')
  const [saving, setSaving] = useState(false)

  const ownerIdx = Object.keys(profileMap).indexOf(lead.added_by)
  const ownerColor = color(ownerIdx)
  const ownerName = lead.added_by_name || profileMap[lead.added_by]?.full_name || 'موظف'
  const date = new Date(lead.created_at).toLocaleDateString('ar-EG', { day:'numeric', month:'short', year:'numeric' })

  async function save() {
    setSaving(true)
    await supabase.from('leads').update({ status, condition_note: note, reviewed_at: new Date().toISOString() }).eq('id', lead.id)
    lead.status = status
    lead.condition_note = note
    setEditing(false)
    setSaving(false)
  }

  return (
    <div className="card">
      <div className="card-top">
        <div>
          <div className="card-name">{lead.client_name}</div>
          {lead.phone && <div className="card-phone">{lead.phone}</div>}
        </div>
        <span className={`badge b-${lead.status}`}>{STATUS[lead.status]}</span>
      </div>
      {lead.notes && <div className="card-notes">{lead.notes}</div>}
      <div className="card-meta">
        <span className="dot" style={{ background: ownerColor }} />
        <span>أضافه {ownerName}</span>
        <span>·</span>
        <span>{date}</span>
      </div>
      {lead.condition_note && (
        <div className="cond-block">
          <div className="cond-lbl">شرط المدير</div>
          <div className="cond-txt">{lead.condition_note}</div>
        </div>
      )}
      {isAdmin && (editing ? (
        <div className="edit-panel">
          <label>الحالة</label>
          <select value={status} onChange={e => setStatus(e.target.value)}>
            <option value="pending">في الانتظار</option>
            <option value="review">تحت المراجعة</option>
            <option value="approved">موافق</option>
            <option value="rejected">مرفوض</option>
          </select>
          <label>الشرط أو الملاحظة</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="اكتب الشرط هنا..." />
          <div className="ep-btns">
            <button className="btn-save" onClick={save} disabled={saving}>{saving ? 'جاري...' : 'حفظ'}</button>
            <button className="btn-cancel" onClick={() => setEditing(false)}>إلغاء</button>
          </div>
        </div>
      ) : (
        <button className="btn-edit" onClick={() => setEditing(true)}>
          {lead.condition_note ? '✏️ تعديل الشرط' : '+ إضافة شرط أو تغيير الحالة'}
        </button>
      ))}
    </div>
  )
}

// ========== ADD LEAD FORM ==========
function AddForm({ user, profile, onAdd, onCancel }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    const { data, error } = await supabase.from('leads').insert({
      client_name: name.trim(), phone: phone.trim(), notes: notes.trim(),
      added_by: user.id, added_by_name: profile?.full_name || user.email, status: 'pending'
    }).select().single()
    if (!error && data) onAdd(data)
    setLoading(false)
  }

  return (
    <div className="form-card">
      <div className="form-title">+ إضافة عارضة جديدة</div>
      <form onSubmit={submit}>
        <div className="fg"><label>اسم العميل *</label><input value={name} onChange={e => setName(e.target.value)} placeholder="الاسم الكامل" required /></div>
        <div className="fg"><label>رقم التليفون</label><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="01xxxxxxxxx" /></div>
        <div className="fg"><label>ملاحظات</label><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="اكتب ملاحظاتك..." /></div>
        <div className="form-btns">
          <button className="btn-main" type="submit" disabled={loading} style={{ flex: 1 }}>{loading ? 'جاري...' : 'حفظ'}</button>
          <button className="btn-cancel" type="button" onClick={onCancel}>إلغاء</button>
        </div>
      </form>
    </div>
  )
}

// ========== LEADS PAGE ==========
function LeadsPage({ user, profile, profileMap, setProfileMap }) {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [tab, setTab] = useState('all')
  const isAdmin = profile?.role === 'admin'

  useEffect(() => {
    load()
    const ch = supabase.channel('leads-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, p => {
        if (p.eventType === 'INSERT') setLeads(prev => [p.new, ...prev])
        else if (p.eventType === 'UPDATE') setLeads(prev => prev.map(l => l.id === p.new.id ? p.new : l))
        else if (p.eventType === 'DELETE') setLeads(prev => prev.filter(l => l.id !== p.old.id))
      }).subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  async function load() {
    const [{ data: ld }, { data: pd }] = await Promise.all([
      supabase.from('leads').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*')
    ])
    if (ld) setLeads(ld)
    if (pd) { const m = {}; pd.forEach(p => { m[p.id] = p }); setProfileMap(m) }
    setLoading(false)
  }

  const filtered = leads.filter(l => {
    if (!isAdmin && l.added_by !== user.id) return false
    if (tab === 'all') return true
    return l.status === tab
  })

  const stats = { total: leads.length, pending: leads.filter(l => l.status === 'pending').length, approved: leads.filter(l => l.status === 'approved').length, rejected: leads.filter(l => l.status === 'rejected').length }

  if (loading) return <div className="loading">جاري التحميل...</div>

  return (
    <>
      {isAdmin && (
        <div className="stats">
          <div className="stat"><div className="stat-n">{stats.total}</div><div className="stat-l">إجمالي العوارض</div></div>
          <div className="stat"><div className="stat-n" style={{ color: 'var(--amber)' }}>{stats.pending}</div><div className="stat-l">في الانتظار</div></div>
          <div className="stat"><div className="stat-n" style={{ color: 'var(--green)' }}>{stats.approved}</div><div className="stat-l">موافق عليها</div></div>
          <div className="stat"><div className="stat-n" style={{ color: 'var(--red)' }}>{stats.rejected}</div><div className="stat-l">مرفوضة</div></div>
        </div>
      )}
      <div className="fbar">
        <div className="ftabs">
          {[['all','الكل'],['pending','انتظار'],['review','مراجعة'],['approved','موافق'],['rejected','مرفوض']].map(([v,l]) => (
            <button key={v} className={`ftab ${tab===v?'active':''}`} onClick={() => setTab(v)}>{l}</button>
          ))}
        </div>
        {!isAdmin && <button className="btn-add" onClick={() => setShowAdd(true)}>+ عارضة جديدة</button>}
      </div>
      {showAdd && !isAdmin && <AddForm user={user} profile={profile} onAdd={l => { setLeads(p => [l, ...p]); setShowAdd(false) }} onCancel={() => setShowAdd(false)} />}
      <div className="leads">
        {filtered.length === 0 ? (
          <div className="empty"><div className="ico">📋</div><p>مفيش عوارض هنا</p></div>
        ) : (
          filtered.map(l => <LeadCard key={l.id} lead={l} isAdmin={isAdmin} profileMap={profileMap} />)
        )}
      </div>
    </>
  )
}

// ========== ADMIN PAGE ==========
function AdminPage({ user, profileMap, setProfileMap }) {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'agent' })
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [changing, setChanging] = useState(null)

  const profiles = Object.values(profileMap)

  async function createUser(e) {
    e.preventDefault()
    setErr('')
    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()

    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(form)
      })
      const result = await res.json()
      if (result.error) { setErr(result.error); setLoading(false); return }
      setOk(`تم إنشاء حساب ${form.full_name} ✅`)
      setForm({ full_name: '', email: '', password: '', role: 'agent' })
      setShowForm(false)
      setTimeout(() => setOk(''), 4000)
      // reload profiles
      const { data } = await supabase.from('profiles').select('*')
      if (data) { const m = {}; data.forEach(p => { m[p.id] = p }); setProfileMap(m) }
    } catch {
      setErr('حصل خطأ، تأكد من الاتصال')
    }
    setLoading(false)
  }

  async function changeRole(id, role) {
    setChanging(id)
    await supabase.from('profiles').update({ role }).eq('id', id)
    const { data } = await supabase.from('profiles').select('*')
    if (data) { const m = {}; data.forEach(p => { m[p.id] = p }); setProfileMap(m) }
    setChanging(null)
  }

  return (
    <div>
      <div className="admin-hdr">
        <div>
          <div className="admin-title">إدارة الحسابات</div>
          <div className="admin-sub">انت اللي بتتحكم في كل الحسابات</div>
        </div>
        <button className="btn-add" onClick={() => { setShowForm(true); setErr('') }}>+ حساب جديد</button>
      </div>

      {ok && <div className="ok">{ok}</div>}

      {showForm && (
        <div className="form-card">
          <div className="form-title">إنشاء حساب جديد</div>
          {err && <div className="err">{err}</div>}
          <form onSubmit={createUser}>
            <div className="form-row2">
              <div className="fg"><label>الاسم الكامل</label><input value={form.full_name} onChange={e => setForm(p => ({...p,full_name:e.target.value}))} placeholder="أحمد محمد" required /></div>
              <div className="fg"><label>الدور</label>
                <select value={form.role} onChange={e => setForm(p => ({...p,role:e.target.value}))}>
                  <option value="agent">موظف</option>
                  <option value="admin">مدير</option>
                </select>
              </div>
            </div>
            <div className="fg"><label>البريد الإلكتروني</label><input type="email" value={form.email} onChange={e => setForm(p => ({...p,email:e.target.value}))} placeholder="name@company.com" required /></div>
            <div className="fg"><label>كلمة السر</label><input type="password" value={form.password} onChange={e => setForm(p => ({...p,password:e.target.value}))} placeholder="8 أحرف على الأقل" minLength={8} required /></div>
            <div className="form-btns">
              <button className="btn-main" type="submit" disabled={loading} style={{flex:1}}>{loading ? 'جاري...' : 'إنشاء الحساب'}</button>
              <button className="btn-cancel" type="button" onClick={() => setShowForm(false)}>إلغاء</button>
            </div>
          </form>
        </div>
      )}

      <div className="users-list">
        <div className="users-hdr">{profiles.length} حساب مسجّل</div>
        {profiles.map((p, i) => (
          <div className="user-row" key={p.id}>
            <div className="user-info">
              <div className="avatar" style={{ background: color(i) }}>{initials(p.full_name)}</div>
              <div>
                <div className="user-name">
                  {p.full_name}
                  {p.id === user.id && <span className="me-tag">أنا</span>}
                </div>
                <div className="user-date">{new Date(p.created_at).toLocaleDateString('ar-EG',{day:'numeric',month:'long',year:'numeric'})}</div>
              </div>
            </div>
            {p.id === user.id ? (
              <span className={`role-badge ${p.role==='admin'?'rb-admin':'rb-agent'}`}>{p.role==='admin'?'مدير':'موظف'}</span>
            ) : (
              <select className="role-sel" value={p.role} onChange={e => changeRole(p.id, e.target.value)} disabled={changing===p.id}>
                <option value="agent">موظف</option>
                <option value="admin">مدير</option>
              </select>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ========== MAIN APP ==========
export default function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profileMap, setProfileMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState('leads')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadUser(session.user)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) loadUser(session.user)
      else { setUser(null); setProfile(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadUser(u) {
    setUser(u)
    const { data } = await supabase.from('profiles').select('*').eq('id', u.id).single()
    setProfile(data)
    setLoading(false)
  }

  if (loading) return <div className="loading">جاري التحميل...</div>
  if (!user) return <Login onLogin={loadUser} />

  const isAdmin = profile?.role === 'admin'
  const userIdx = Object.keys(profileMap).indexOf(user.id)
  const userColor = color(userIdx)

  return (
    <div>
      <div className="topbar">
        <div className="brand">
          <div className="brand-logo">ع</div>
          <span className="brand-name">نظام العوارض</span>
          <span className="rdot" title="متصل" />
        </div>

        {isAdmin && (
          <div className="nav">
            <button className={`nav-btn ${page==='leads'?'active':''}`} onClick={() => setPage('leads')}>📋 العوارض</button>
            <button className={`nav-btn ${page==='admin'?'active':''}`} onClick={() => setPage('admin')}>👥 الحسابات</button>
          </div>
        )}

        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div className="user-chip">
            <div className="avatar" style={{ background: userColor }}>{initials(profile?.full_name || user.email)}</div>
            <div>
              <div className="chip-name">{profile?.full_name || user.email}</div>
              <div className="chip-role">{isAdmin ? 'مدير' : 'موظف'}</div>
            </div>
          </div>
          <button className="btn-out" onClick={() => supabase.auth.signOut()}>خروج</button>
        </div>
      </div>

      <div className="page">
        {page === 'leads' && <LeadsPage user={user} profile={profile} profileMap={profileMap} setProfileMap={setProfileMap} />}
        {page === 'admin' && isAdmin && <AdminPage user={user} profileMap={profileMap} setProfileMap={setProfileMap} />}
      </div>
    </div>
  )
}
