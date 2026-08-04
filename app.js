(() => {
  'use strict';
  const APP_VERSION = '1.3.16';
  const APP_BUILD_DATE = '04-Aug-2026 17:30 IST';
  const APP_SCHEMA_VERSION = '24';
  window.APP_VERSION = APP_VERSION;
  window.SAMARA_BUILD = Object.freeze({
    version: APP_VERSION,
    buildDate: APP_BUILD_DATE,
    schemaVersion: APP_SCHEMA_VERSION
  });
  console.info(`Samara Care ERP ${APP_VERSION} | Build: ${APP_BUILD_DATE} | Schema: ${APP_SCHEMA_VERSION}`);
  const h = React.createElement;
  const cfg = window.SAMARA_CONFIG;
  const sdk = window.supabase;
  if (!cfg || !sdk) {
    document.getElementById('root').innerHTML = '<div class="loading">Unable to load application libraries.</div>';
    return;
  }
  const client = sdk.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  async function writeAuditEvent(action,entity='System',entityId=null,details=null,result='Success'){
    try{
      const {data:{user}}=await client.auth.getUser();
      if(!user)return;
      await client.rpc('record_audit_event',{
        p_action:action,
        p_entity:entity,
        p_entity_id:entityId?String(entityId):null,
        p_details:details||{},
        p_result:result
      });
    }catch(error){console.warn('Audit event could not be recorded:',error)}
  }

  const ROLES = ['Admin','Manager','Nurse','Caregiver','Accounts','Kitchen'];
  const EMPLOYEE_TITLES = ['Dr.','Prof.','Mr.','Mrs.','Ms.','Miss','Shri','Smt.','Rev.','Fr.','Br.','Sr.','Other'];
  const PATIENT_TITLES = ['Dr.','Mr.','Mrs.','Ms.','Miss','Shri','Smt.','Master','Baby','Kumari','Late','Other'];
  const formalName = row => [String(row?.title||'').trim(),String(row?.full_name||'').trim()].filter(Boolean).join(' ');
  const displayName = row => formalName(row);
  const ROOM_NUMBER_OPTIONS = Array.from({length:26},(_,i)=>String(100+i));
  const BED_CODE_OPTIONS = ['A','B','C','D'];
  const NAV_SECTIONS = [
    { title:'OVERVIEW', items:['Dashboard','Notifications'] },
    { title:'ADMIN', items:['Employees','Audit Trail'] },
    { title:'ADMISSION', items:['Enquiries','Admissions','Patients','Discharge','Documents'] },
    { title:'MANAGER', items:['Reports','Intelligent Reports','Medication Errors','Recovery Timeline'] },
    { title:'NURSING', items:['Clinical Dashboard','Shift Tasks','Daily Care','Vital Signs','Medicines','Physiotherapy','Special Nurse','Shift Handover'] },
    { title:'OPERATIONS', items:['Rooms & Beds','Incidents'] },
    { title:'FOOD & DIET', items:['Food & Diet'] },
    { title:'ACCOUNTS / BILLING', items:['Bills & Charges','Billing & Payments'] }
  ];
  const ALL_NAV = NAV_SECTIONS.flatMap(section=>section.items);
  const ROLE_NAV={
    Admin:ALL_NAV,
    Manager:ALL_NAV,
    Nurse:['Clinical Dashboard','Patients','Discharge','Shift Tasks','Daily Care','Vital Signs','Medicines','Food & Diet','Physiotherapy','Special Nurse','Shift Handover','Incidents','Bills & Charges','Notifications'],
    Caregiver:['Clinical Dashboard','Patients','Discharge','Shift Tasks','Daily Care','Vital Signs','Medicines','Food & Diet','Physiotherapy','Special Nurse','Shift Handover','Incidents','Notifications'],
    Accounts:['Notifications','Patients','Discharge','Physiotherapy','Special Nurse','Rooms & Beds','Bills & Charges','Billing & Payments','Reports','Intelligent Reports'],
    Kitchen:['Notifications','Patients','Discharge','Physiotherapy','Special Nurse','Food & Diet']
  };
  const ROLE_HOME={Admin:'Dashboard',Manager:'Dashboard',Nurse:'Clinical Dashboard',Caregiver:'Clinical Dashboard',Accounts:'Billing & Payments',Kitchen:'Food & Diet'};
  const CLINICAL_ROLES=['Nurse','Caregiver'];
  const ROLE_LABELS={
    'Clinical Dashboard':'Nursing Dashboard',
    'Patients':'My Patients',
    'Medicines':'Medication Administration',
    'Notifications':'Alerts'
  };
  const displayNavLabel=(item,role)=>CLINICAL_ROLES.includes(role)?(ROLE_LABELS[item]||item):item;
  const sectionsFor = (allowed,role) => {
    if(CLINICAL_ROLES.includes(role)){
      return [
        {title:'NURSING WORKSPACE',items:['Clinical Dashboard','Patients','Shift Tasks','Daily Care','Vital Signs','Medicines','Food & Diet','Physiotherapy','Special Nurse','Shift Handover','Incidents','Notifications'].filter(item=>allowed.includes(item))}
      ];
    }
    return NAV_SECTIONS.map(section=>({...section,items:section.items.filter(item=>allowed.includes(item))})).filter(section=>section.items.length);
  };
  const normalizeLogin = value => value.trim().toLowerCase().replace(/[^a-z0-9._-]/g,'');
  const loginEmail = value => `${normalizeLogin(value)}@${cfg.employeeEmailDomain}`;
  const pad2 = value => String(value).padStart(2,'0');
  const formatDateIN = value => {
    if(!value)return '—';
    const raw=String(value).trim();
    const dateOnly=raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(dateOnly)return `${dateOnly[3]}-${dateOnly[2]}-${dateOnly[1]}`;
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return raw;
    const parts=new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'2-digit',year:'numeric'}).formatToParts(date);
    const get=type=>parts.find(part=>part.type===type)?.value||'';
    return `${get('day')}-${get('month')}-${get('year')}`;
  };
  const formatTimeIN = value => {
    if(!value)return '—';
    const date=value instanceof Date?value:new Date(value);
    if(Number.isNaN(date.getTime()))return String(value);
    return new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',hour12:true}).format(date).toUpperCase();
  };
  const formatDateTimeIN = value => {
    if(!value)return '—';
    const date=value instanceof Date?value:new Date(value);
    if(Number.isNaN(date.getTime()))return String(value);
    return `${formatDateIN(date)} ${formatTimeIN(date)}`;
  };
  const fmt = value => formatDateTimeIN(value);
  const todayISOIndia = () => {
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const get=type=>parts.find(part=>part.type===type)?.value||'';
    return `${get('year')}-${get('month')}-${get('day')}`;
  };
  const isFutureDateIndia = value => Boolean(value&&String(value).slice(0,10)>todayISOIndia());
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[ch]));
  const whatsappNumber = value => { const digits=String(value||'').replace(/\D/g,''); if(!digits)return ''; if(digits.length===10)return `91${digits}`; if(digits.length===11&&digits.startsWith('0'))return `91${digits.slice(1)}`; return digits; };
  const whatsappWelcomeUrl = (row,tempPassword='') => {
    const number=whatsappNumber(row.mobile); if(!number)return '';
    const name=formalName(row)||row.full_name||'Colleague';
    const roleLine={
      Nurse:'As a Nurse, your compassion, patience and clinical skills will make a meaningful difference in the lives of our residents.',
      Caregiver:'Your kindness, patience and gentle support will bring comfort and confidence to our residents every day.',
      Manager:'Your leadership will help us maintain high standards of resident care, teamwork and operational excellence.',
      Accounts:'Your careful work will help us serve residents and families with transparency and trust.',
      Kitchen:'Your care in preparing safe and nourishing food is an important part of every resident’s wellbeing.'
    }[row.role]||'Your contribution will help us provide compassionate, respectful and high-quality care.';
    const credentials=tempPassword?`

Your Login Details
Login ID: ${row.login_id}
Temporary Password: ${tempPassword}`:`

Login ID: ${row.login_id}`;
    const text=`Dear ${name},

Welcome to the Samara Family! 💚

We are delighted to have you with us. At Samara, every resident deserves dignity, compassion and respect. From today, you become an important part of that mission.

${roleLine}${credentials}

ERP Portal: https://rajaiahboomi-crypto.github.io/Samara_AL_ERP_V7/

Please sign in and create a password of your own choice at the first login.

We wish you a successful, fulfilling and rewarding journey with us. All the very best!

Samara Health Care LLP
Caring with Compassion. Living with Dignity.`;
    return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
  };


  function CameraCaptureModal({config,onClose}){
    const videoRef=React.useRef(null),canvasRef=React.useRef(null),streamRef=React.useRef(null);
    const [error,setError]=React.useState(''),[ready,setReady]=React.useState(false),[captured,setCaptured]=React.useState('');
    React.useEffect(()=>{
      let cancelled=false;
      async function start(){
        try{
          if(!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access is not supported by this browser.');
          const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:config.facingMode||'user',width:{ideal:1280},height:{ideal:720}},audio:false});
          if(cancelled){stream.getTracks().forEach(t=>t.stop());return}
          streamRef.current=stream;
          if(videoRef.current){videoRef.current.srcObject=stream;await videoRef.current.play();setReady(true)}
        }catch(e){setError(e.message||'Unable to open camera. Please allow camera permission and try again.')}
      }
      start();
      return()=>{cancelled=true;streamRef.current?.getTracks().forEach(t=>t.stop())}
    },[config]);
    function takePhoto(){
      const video=videoRef.current,canvas=canvasRef.current;
      if(!video||!canvas)return;
      const width=video.videoWidth||1280,height=video.videoHeight||720;
      canvas.width=width;canvas.height=height;
      canvas.getContext('2d').drawImage(video,0,0,width,height);
      setCaptured(canvas.toDataURL('image/jpeg',0.9));
    }
    function retake(){setCaptured('')}
    function usePhoto(){
      const canvas=canvasRef.current;
      canvas.toBlob(blob=>{
        if(!blob)return;
        const file=new File([blob],`${config.filePrefix||'camera'}-${Date.now()}.jpg`,{type:'image/jpeg'});
        config.onCapture(file);onClose();
      },'image/jpeg',0.9);
    }
    return h('div',{className:'modal-backdrop camera-backdrop'},h('div',{className:'card modal camera-modal'},
      h('div',{className:'panel-head'},h('div',null,h('h3',null,config.title||'Camera Capture'),h('small',null,config.facingMode==='environment'?'Rear camera / document capture':'Front camera / webcam')),h('button',{type:'button',className:'close',onClick:onClose},'×')),
      error?h('div',{className:'message error'},error):null,
      h('div',{className:'camera-stage'},
        captured?h('img',{src:captured,alt:'Captured preview',className:'camera-preview'}):h('video',{ref:videoRef,playsInline:true,muted:true,className:'camera-video'}),
        h('canvas',{ref:canvasRef,className:'camera-canvas'})
      ),
      h('div',{className:'camera-actions'},
        !captured?h('button',{type:'button',className:'btn btn-primary',disabled:!ready,onClick:takePhoto},ready?'Capture Photo':'Opening Camera…'):null,
        captured?h('button',{type:'button',className:'btn btn-secondary',onClick:retake},'Retake'):null,
        captured?h('button',{type:'button',className:'btn btn-primary',onClick:usePhoto},'Use This Photo'):null,
        h('button',{type:'button',className:'btn btn-danger',onClick:onClose},'Cancel')
      )
    ));
  }

  function GlobalSearch({onNavigate,profile}){
    const [query,setQuery]=React.useState('');
    const [results,setResults]=React.useState([]);
    const [busy,setBusy]=React.useState(false);
    const [open,setOpen]=React.useState(false);
    const timerRef=React.useRef(null);
    React.useEffect(()=>()=>clearTimeout(timerRef.current),[]);
    function searchable(value){return String(value||'').toLowerCase()}
    function matches(row,q,fields){return fields.some(key=>searchable(row[key]).includes(q))}
    function change(value){
      setQuery(value);clearTimeout(timerRef.current);
      const trimmed=value.trim().toLowerCase();
      if(trimmed.length<2){setResults([]);setOpen(false);return}
      timerRef.current=setTimeout(async()=>{
        setBusy(true);
        const clinicalOnly=CLINICAL_ROLES.includes(profile?.role);
        const [employees,patients]=await Promise.all([
          clinicalOnly?Promise.resolve({data:[]}):client.from('profiles').select('id,title,full_name,employee_id,login_id,mobile,role,is_active').limit(300),
          client.from('patients').select('id,title,full_name,patient_id,mobile,attendant_phone,room_no,bed_no,diagnosis,treating_doctor,referring_doctor,hospital_name,is_active').limit(500)
        ]);
        const employeeRows=(employees.data||[]).filter(row=>matches(row,trimmed,['title','full_name','employee_id','login_id','mobile','role'])).map(row=>({type:'Employee',row,label:formalName(row),sub:[row.employee_id,row.login_id,row.role,row.mobile].filter(Boolean).join(' · ')}));
        const patientRows=(patients.data||[]).filter(row=>matches(row,trimmed,['title','full_name','patient_id','mobile','attendant_phone','room_no','bed_no','diagnosis','treating_doctor','referring_doctor','hospital_name'])).map(row=>({type:'Patient',row,label:formalName(row),sub:[row.patient_id,row.room_no&&`Room ${row.room_no}${row.bed_no?`-${row.bed_no}`:''}`,row.diagnosis,row.mobile||row.attendant_phone].filter(Boolean).join(' · ')}));
        setResults([...patientRows,...employeeRows].slice(0,20));setOpen(true);setBusy(false);
      },250);
    }
    function choose(result){
      setOpen(false);setQuery('');
      onNavigate(result.type==='Patient'?'Patients':'Employees');
    }
    return h('div',{className:'global-search'},
      h('div',{className:'global-search-box'},h('span',{className:'global-search-icon','aria-hidden':'true'},'⌕'),h('input',{value:query,onChange:e=>change(e.target.value),onFocus:()=>query.trim().length>=2&&setOpen(true),placeholder:CLINICAL_ROLES.includes(profile?.role)?'Search patient…':'Search patient or employee…','aria-label':'Global search'}),query&&h('button',{type:'button',className:'global-search-clear',onClick:()=>{setQuery('');setResults([]);setOpen(false)}},'×')),
      open&&h('div',{className:'global-search-results'},busy?h('div',{className:'global-search-empty'},'Searching…'):results.length?results.map((result,index)=>h('button',{type:'button',className:'global-search-result',key:`${result.type}-${result.row.id}-${index}`,onClick:()=>choose(result)},h('span',{className:`search-type ${result.type.toLowerCase()}`},result.type),h('span',{className:'search-result-main'},h('strong',null,result.label||'Unnamed'),h('small',null,result.sub||'No additional details')))):h('div',{className:'global-search-empty'},CLINICAL_ROLES.includes(profile?.role)?'No matching patients found.':'No matching patients or employees found.'))
    );
  }

  function App(){
    const [session,setSession]=React.useState(null);
    const [profile,setProfile]=React.useState(null);
    const [loading,setLoading]=React.useState(true);
    const [page,setPage]=React.useState('Dashboard');
    const [mobileDrawerOpen,setMobileDrawerOpen]=React.useState(false);
    const [authMessage,setAuthMessage]=React.useState('');
    const [recoveryMode,setRecoveryMode]=React.useState(false);

    React.useEffect(()=>{
      const splash=document.getElementById('app-splash');
      const removeSplash=()=>{ if(splash){ splash.classList.add('splash-hide'); setTimeout(()=>splash.remove(),320); } };
      const splashTimer=setTimeout(removeSplash,1450);
      client.auth.getSession().then(({data})=>setSession(data.session||null)).finally(()=>setLoading(false));
      const {data:{subscription}}=client.auth.onAuthStateChange((event,next)=>{
        if(event==='PASSWORD_RECOVERY') setRecoveryMode(true);
        setSession(next);
      });
      if('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
      return()=>{clearTimeout(splashTimer);subscription.unsubscribe();};
    },[]);

    React.useEffect(()=>{
      if(!session){setProfile(null);return;}
      (async()=>{
        let data=null;
        const direct=await client.from('profiles').select('*').or(`id.eq.${session.user.id},auth_user_id.eq.${session.user.id}`).maybeSingle();
        if(direct.error) console.error(direct.error);
        data=direct.data||null;

        // Login-only compatibility repair: securely locate and link an existing
        // employee profile when the Authentication account was created separately.
        if(!data){
          const repaired=await client.rpc('get_my_employee_profile');
          if(repaired.error) console.error(repaired.error);
          data=repaired.data||null;
        }

        if(!data){
          setAuthMessage('Your employee profile is not linked to this Login ID. Please contact the Administrator.');
          await client.auth.signOut();
          return;
        }
        if(data.is_active===false||data.active===false){
          setAuthMessage('This employee account is inactive. Please contact the Administrator.');
          await client.auth.signOut();
          return;
        }
        // Recovery for accounts whose Auth password was already changed but whose
        // profile flag remained set because an older deployment/RLS blocked the update.
        const authCompleted = session.user?.user_metadata?.must_change_password === false;
        if(data.must_change_password && authCompleted){
          data={...data,must_change_password:false};
          client.rpc('complete_my_first_login').then(()=>{}).catch(()=>{});
        }
        setProfile(data);
        setPage(ROLE_HOME[data.role]||'Notifications');
        client.from('profiles').update({last_sign_in_at:new Date().toISOString()}).eq('id',data.id).then(()=>{});
      })();
    },[session]);

    React.useEffect(()=>{
      if(!session||recoveryMode)return;
      let timer;
      const reset=()=>{clearTimeout(timer);timer=setTimeout(async()=>{await client.auth.signOut();setAuthMessage('You were signed out after 30 minutes of inactivity for security.');},30*60*1000)};
      const events=['click','keydown','touchstart','mousemove'];
      events.forEach(name=>window.addEventListener(name,reset,{passive:true}));reset();
      return()=>{clearTimeout(timer);events.forEach(name=>window.removeEventListener(name,reset))};
    },[session,recoveryMode]);

    if(loading) return h('div',{className:'loading'},'Loading Samara Care…');
    if(recoveryMode&&session) return h(RecoveryPasswordChange,{onComplete:async()=>{setRecoveryMode(false);await client.auth.signOut();setAuthMessage('Password changed successfully. Please sign in with your new password.')}});
    if(!session) return h(Login,{externalMessage:authMessage,onClearMessage:()=>setAuthMessage('')});
    if(!profile) return h('div',{className:'loading'},'Loading your employee profile…');
    if(profile.must_change_password) return h(FirstLoginPasswordChange,{profile,onComplete:()=>setProfile({...profile,must_change_password:false})});

    const allowed = ROLE_NAV[profile.role]||['Dashboard'];
    if(!allowed.includes(page)) setTimeout(()=>setPage(ROLE_HOME[profile.role]||allowed[0]||'Notifications'),0);
    return h('div',{className:'app'},
      h(Sidebar,{profile,page,setPage,allowed}),
      h('main',{className:'main'},
        h('header',{className:'topbar'},
          h('div',{className:'mobile-brand-header'},
            h('div',{className:'mobile-brand-logo'},'SC'),
            h('strong',null,'Samara Care ERP')
          ),
          h('button',{type:'button',className:'mobile-home-button','aria-label':'Go to dashboard',title:'Dashboard',onClick:()=>setPage(ROLE_HOME[profile.role]||allowed[0])},'⌂'),
          h('h2',null,displayNavLabel(page,profile.role)),
          h(GlobalSearch,{onNavigate:setPage,profile}),
          h('span',{className:'badge'},profile.role)
        ),
        h(MobileMenu,{page,setPage,allowed,profile}),
        h('section',{className:'content'},
          page==='Dashboard'&&h(Dashboard,{profile,onNavigate:setPage}),
          page==='Employees'&&h(Employees,{profile}),
          page==='Enquiries'&&h(Enquiries,{profile}),
          page==='Admissions'&&h(Admissions,{profile}),
          page==='Clinical Dashboard'&&h(ClinicalDashboard,{profile,onNavigate:setPage}),page==='Shift Tasks'&&h(ShiftTasks,{profile}),
          page==='Patients'&&h(Patients,{profile}),
          page==='Discharge'&&h(DischargeManagement,{profile}),
          page==='Rooms & Beds'&&h(RoomsBeds,{profile}),
          page==='Daily Care'&&h(DailyCare,{profile}),
          page==='Vital Signs'&&h(VitalSigns,{profile}),
          page==='Medicines'&&h(Medicines,{profile}),
          page==='Food & Diet'&&h(FoodDiet,{profile}),
          page==='Physiotherapy'&&h(Physiotherapy,{profile}),
          page==='Special Nurse'&&h(SpecialNurseManagement,{profile}),
          page==='Shift Handover'&&h(ShiftHandover,{profile}),
          page==='Incidents'&&h(Incidents,{profile}),
          page==='Documents'&&h(Documents,{profile}),
          page==='Bills & Charges'&&h(BillsCharges,{profile}),
          page==='Billing & Payments'&&h(BillingPayments,{profile}),
          page==='Recovery Timeline'&&h(RecoveryTimeline,{profile}),
          page==='Reports'&&h(Reports),
          page==='Intelligent Reports'&&h(IntelligentReports,{profile}),
          page==='Medication Errors'&&h(MedicationErrors,{profile,onNavigate:setPage}),
          page==='Notifications'&&h(Notifications,{profile}),
          page==='Audit Trail'&&h(AuditTrail)
        ),
        h(MobileBottomNav,{page,setPage,allowed,profile,onOpenMenu:()=>setMobileDrawerOpen(true)}),
        mobileDrawerOpen&&h(MobileNavigationDrawer,{profile,allowed,page,onNavigate:(next)=>{setPage(next);setMobileDrawerOpen(false)},onClose:()=>setMobileDrawerOpen(false)})
      )
    );
  }

  function FirstLoginPasswordChange({profile,onComplete}){
    const [password,setPassword]=React.useState(''),[confirm,setConfirm]=React.useState(''),[busy,setBusy]=React.useState(false),[message,setMessage]=React.useState('');
    async function submit(e){
      e.preventDefault();setMessage('');
      if(password.length<8){setMessage('Please choose a password containing at least 8 characters.');return}
      if(password!==confirm){setMessage('The two passwords do not match.');return}
      setBusy(true);
      const currentMeta=(await client.auth.getUser()).data?.user?.user_metadata||{};
      const {error:authError}=await client.auth.updateUser({
        password,
        data:{...currentMeta,must_change_password:false,password_changed_at:new Date().toISOString()}
      });
      if(authError){
        const msg=String(authError.message||'');
        setMessage(msg.toLowerCase().includes('different from the old')
          ? 'Please enter a completely new password. Do not use the temporary password again.'
          : msg);
        setBusy(false);return;
      }
      // Primary database completion. Authentication metadata above is also kept as
      // a safe recovery marker, preventing a repeated onboarding loop.
      const {error:profileError}=await client.rpc('complete_my_first_login');
      if(profileError){
        console.warn('Profile completion RPC unavailable; continuing with secure Auth completion marker.',profileError);
      }
      await client.auth.refreshSession();
      setBusy(false);onComplete();
    }
    return h('div',{className:'login-shell'},h('form',{className:'card login-card first-login-card',onSubmit:submit},
      h('div',{className:'brand'},h('div',{className:'logo'},'SC'),h('div',null,h('h1',null,`Welcome to the Samara Family, ${displayName(profile)} 👋`),h('p',null,'We are delighted that you are joining our Assisted Living Team.'))),
      h('p',null,'Before you begin, please create your own secure password. This protects resident information and ensures that only you can access your account.'),
      message&&h('div',{className:'message error'},message),
      h('div',{className:'field'},h('label',null,'Create New Password'),h('input',{type:'password',value:password,onChange:e=>setPassword(e.target.value),minLength:8,required:true,autoComplete:'new-password',name:'samara-new-secure-password'})),
      h('div',{className:'field'},h('label',null,'Confirm New Password'),h('input',{type:'password',value:confirm,onChange:e=>setConfirm(e.target.value),minLength:8,required:true,autoComplete:'new-password',name:'samara-confirm-secure-password'})),
      h('p',{className:'small-note'},'Use a completely new password. Do not repeat the temporary password.'),
      h('button',{className:'btn btn-primary full',disabled:busy},busy?'Activating your account…':'Create Password & Enter Samara ERP'),
      h('p',{className:'small-note'},'Caring with Compassion. Living with Dignity.')
    ));
  }

  function Login({externalMessage,onClearMessage}){
    const [login,setLogin]=React.useState('');
    const [password,setPassword]=React.useState('');
    const [busy,setBusy]=React.useState(false);
    const [message,setMessage]=React.useState(externalMessage||'');
    const [forgot,setForgot]=React.useState(false);
    const [recoveryLogin,setRecoveryLogin]=React.useState('');
    const [recoveryBusy,setRecoveryBusy]=React.useState(false);
    const [recoveryMessage,setRecoveryMessage]=React.useState('');
    React.useEffect(()=>{if(externalMessage)setMessage(externalMessage)},[externalMessage]);
    async function securityRequest(payload){
      const response=await fetch(`${cfg.supabaseUrl}/functions/v1/admin-users`,{method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.supabasePublishableKey},body:JSON.stringify(payload)});
      const result=await response.json().catch(()=>({}));
      if(!response.ok||result.error)throw new Error(result.error||'Unable to complete the security request');
      return result;
    }
    async function submit(e){
      e.preventDefault();setBusy(true);setMessage('');if(onClearMessage)onClearMessage();
      const normalized=normalizeLogin(login);
      try{
        const check=await securityRequest({action:'login_precheck',login_id:normalized});
        if(check.locked){setMessage('This account is temporarily locked after repeated unsuccessful attempts. Please try again later or contact the Administrator.');setBusy(false);return}
      }catch(_error){/* Sign-in remains available if the optional security check is temporarily unavailable. */}
      let email='';
      if(login.includes('@')){
        email=login.trim().toLowerCase();
      }else{
        const {data:resolved,error:resolveError}=await client.rpc('resolve_employee_login',{p_login_id:normalized});
        if(resolveError){setMessage('Unable to verify the Login ID. Please contact the Administrator.');setBusy(false);return}
        email=String(resolved||'').trim().toLowerCase();
        if(!email){setMessage('Incorrect Login ID or password.');setBusy(false);return}
      }
      const {error}=await client.auth.signInWithPassword({email,password});
      if(error){
        try{await securityRequest({action:'login_failure',login_id:normalized})}catch(_error){}
        setMessage(error.message==='Invalid login credentials'?'Incorrect Login ID or password.':error.message);
      }else{
        try{await securityRequest({action:'login_success',login_id:normalized})}catch(_error){}
        await writeAuditEvent('User Login','Authentication',normalized,{login_id:normalized},'Success');
      }
      setBusy(false);
    }
    async function requestRecovery(e){
      e.preventDefault();setRecoveryBusy(true);setRecoveryMessage('');
      try{
        const redirectTo=new URL(window.location.href);redirectTo.hash='';redirectTo.search='';
        await securityRequest({action:'request_password_recovery',login_id:recoveryLogin.trim(),redirect_to:redirectTo.toString()});
        setRecoveryMessage('If a registered employee email is available, a secure password-reset link has been sent. Please check Inbox and Spam.');
      }catch(error){
        setRecoveryMessage(error.message||'Unable to request a password reset. Please contact the Administrator.');
      }
      setRecoveryBusy(false);
    }
    return h('div',{className:'login-shell login-v3-shell'},
      h('div',{className:'login-v3-frame'},
        h('section',{className:'login-v3-hero'},
          h('div',{className:'login-v3-logo'},'SC'),
          h('div',{className:'login-v3-kicker'},'SAMARA HEALTH CARE LLP'),
          h('h1',null,'Samara Care ERP'),
          h('p',{className:'login-v3-description'},'Resident care, clinical operations, billing and documents in one secure workspace.'),
          h('div',{className:'login-v3-features'},
            h('div',null,h('span',null,'✓'),'Live multi-user updates'),
            h('div',null,h('span',null,'✓'),'Mobile, tablet and desktop'),
            h('div',null,h('span',null,'✓'),'Secure Supabase cloud data')
          )
        ),
        forgot?h('form',{className:'login-v3-form',onSubmit:requestRecovery},
          h('div',{className:'login-v3-kicker login-v3-kicker-dark'},'PASSWORD RECOVERY'),
          h('h2',null,'Forgot your password?'),
          h('p',{className:'login-v3-subtitle'},'Enter your employee Login ID or registered employee email.'),
          recoveryMessage&&h('div',{className:`message ${recoveryMessage.startsWith('If a registered')?'success':'error'}`},recoveryMessage),
          h('div',{className:'field'},h('label',null,'Login ID or Email'),h('input',{value:recoveryLogin,onChange:e=>setRecoveryLogin(e.target.value),required:true,autoCapitalize:'none',placeholder:'Enter Login ID or email'})),
          h('button',{className:'btn btn-primary full login-v3-button',disabled:recoveryBusy},recoveryBusy?'Sending secure link…':'Send Password Reset Link'),
          h('button',{type:'button',className:'login-link-button',onClick:()=>{setForgot(false);setRecoveryMessage('')}},'← Back to Sign in'),
          h('p',{className:'small-note'},'No email access? Ask the Administrator to use Reset Password in Employee Master.'),
          h('div',{className:'login-v3-version'},`Samara Care ERP ${APP_VERSION}`)
        ):h('form',{className:'login-v3-form',onSubmit:submit},
          h('div',{className:'login-v3-kicker login-v3-kicker-dark'},'SECURE STAFF ACCESS'),
          h('h2',null,'Welcome back'),
          h('p',{className:'login-v3-subtitle'},'Sign in with your employee Login ID.'),
          message&&h('div',{className:'message error'},message),
          h('div',{className:'field'},h('label',null,'Login ID'),h('input',{value:login,onChange:e=>setLogin(e.target.value),required:true,autoCapitalize:'none',placeholder:'Enter login ID'})),
          h('div',{className:'field'},h('label',null,'Password'),h('input',{type:'password',value:password,onChange:e=>setPassword(e.target.value),required:true,placeholder:'Enter password'})),
          h('button',{type:'button',className:'login-link-button forgot-password-link',onClick:()=>{setForgot(true);setRecoveryLogin(login);setMessage('')}},'Forgot Password?'),
          h('button',{className:'btn btn-primary full login-v3-button',disabled:busy},busy?'Signing in…':'Sign in'),
          h('div',{className:'login-v3-version'},`Samara Care ERP ${APP_VERSION}`)
        )
      )
    );
  }

  function RecoveryPasswordChange({onComplete}){
    const [password,setPassword]=React.useState(''),[confirm,setConfirm]=React.useState(''),[busy,setBusy]=React.useState(false),[message,setMessage]=React.useState('');
    async function submit(e){
      e.preventDefault();setMessage('');
      if(password.length<8){setMessage('Please choose a password containing at least 8 characters.');return}
      if(password!==confirm){setMessage('The two passwords do not match.');return}
      setBusy(true);
      const {error}=await client.auth.updateUser({password,data:{must_change_password:false,password_changed_at:new Date().toISOString(),password_recovered_at:new Date().toISOString()}});
      if(error){setMessage(error.message||'Unable to change password.');setBusy(false);return}
      try{await client.rpc('complete_my_first_login')}catch(_error){}
      setBusy(false);await onComplete();
    }
    return h('div',{className:'login-shell'},h('form',{className:'card login-card first-login-card',onSubmit:submit},
      h('div',{className:'brand'},h('div',{className:'logo'},'SC'),h('div',null,h('h1',null,'Create a New Password'),h('p',null,'Your secure recovery link has been verified.'))),
      h('p',null,'Enter a new password for your Samara Care ERP account.'),
      message&&h('div',{className:'message error'},message),
      h('div',{className:'field'},h('label',null,'New Password'),h('input',{type:'password',value:password,onChange:e=>setPassword(e.target.value),minLength:8,required:true,autoComplete:'new-password'})),
      h('div',{className:'field'},h('label',null,'Confirm New Password'),h('input',{type:'password',value:confirm,onChange:e=>setConfirm(e.target.value),minLength:8,required:true,autoComplete:'new-password'})),
      h('button',{className:'btn btn-primary full',disabled:busy},busy?'Saving new password…':'Save New Password'),
      h('p',{className:'small-note'},'After saving, sign in with your new password.')
    ));
  }

  function Sidebar({profile,page,setPage,allowed}){
    const sections=sectionsFor(allowed,profile.role);
    const activeSection=sections.find(section=>section.items.includes(page))?.title||sections[0]?.title||'';
    const [openSection,setOpenSection]=React.useState(activeSection);
    React.useEffect(()=>{
      const next=sections.find(section=>section.items.includes(page))?.title;
      if(next)setOpenSection(next);
    },[page,allowed.join('|')]);
    function toggle(title){setOpenSection(current=>current===title?'':title)}
    return h('aside',{className:'sidebar'},
      h('div',{className:'side-brand'},h('div',{className:'side-logo'},'SC'),h('div',null,h('strong',null,'Samara Care'),h('small',null,`Assisted Living ERP ${APP_VERSION}`))),
      h('nav',{className:'nav-scroll'},sections.map(section=>{
        const expanded=openSection===section.title;
        return h('div',{className:`nav-section ${expanded?'expanded':''}`,key:section.title},
          h('button',{
            type:'button',
            className:'nav-heading-button',
            onClick:()=>toggle(section.title),
            'aria-expanded':expanded
          },h('span',null,section.title),h('span',{className:'nav-chevron','aria-hidden':'true'},expanded?'−':'+')),
          expanded&&h('div',{className:'nav nav-submenu'},section.items.map(item=>h('button',{
            key:item,
            className:page===item?'active':'',
            onClick:()=>setPage(item)
          },displayNavLabel(item,profile.role))))
        );
      })),
      h('div',{className:'sidebar-footer'},h('div',{className:'user-chip'},h('strong',null,formalName(profile)),h('small',null,`${profile.login_id} · ${profile.role}`)),h('button',{className:'btn btn-secondary full',onClick:async()=>{await writeAuditEvent('User Logout','Authentication',profile.id,{login_id:profile.login_id},'Success');await client.auth.signOut()}},'Sign out'))
    );
  }

  function MobileMenu({page,setPage,allowed,profile}){
    const sections=sectionsFor(allowed,profile.role);
    return h('div',{className:'mobile-menu'},
      h('label',null,'Module'),
      h('select',{value:page,onChange:e=>setPage(e.target.value)},
        sections.map(section=>h('optgroup',{label:section.title,key:section.title},section.items.map(item=>h('option',{value:item,key:item},displayNavLabel(item,profile.role)))))
      )
    );
  }


  function MobileBottomNav({page,setPage,allowed,profile,onOpenMenu}){
    const home=ROLE_HOME[profile.role]||allowed[0]||'Dashboard';
    const choose=(preferred,fallbacks=[])=>[preferred,...fallbacks].find(item=>allowed.includes(item));
    const patients=choose('Patients');
    const work=CLINICAL_ROLES.includes(profile.role)
      ? choose('Shift Tasks',['Clinical Dashboard','Daily Care','Vital Signs'])
      : choose('Clinical Dashboard',['Admissions','Employees','Billing & Payments']);
    const reports=choose('Reports',['Intelligent Reports','Billing & Payments','Notifications']);
    const items=[
      {page:home,icon:'⌂',label:'Home'},
      patients&&{page:patients,icon:'♙',label:'Patients'},
      work&&{page:work,icon:'✚',label:CLINICAL_ROLES.includes(profile.role)?'Tasks':'Work'},
      reports&&{page:reports,icon:'▥',label:'Reports'}
    ].filter(Boolean);
    return h('nav',{className:'mobile-bottom-nav','aria-label':'Mobile navigation'},
      items.map(item=>h('button',{type:'button',key:item.label,className:page===item.page?'active':'',onClick:()=>setPage(item.page),'aria-label':item.label},h('span',{className:'mobile-nav-icon'},item.icon),h('span',null,item.label))),
      h('button',{type:'button',onClick:onOpenMenu,'aria-label':'Open all modules'},h('span',{className:'mobile-nav-icon'},'☰'),h('span',null,'Menu'))
    );
  }


  function MobileNavigationDrawer({profile,allowed,page,onNavigate,onClose}){
    const sections=sectionsFor(allowed,profile.role);
    const home=ROLE_HOME[profile.role]||allowed[0]||'Dashboard';
    React.useEffect(()=>{
      const onKey=e=>{if(e.key==='Escape')onClose()};
      document.addEventListener('keydown',onKey);
      document.body.classList.add('mobile-drawer-open');
      return()=>{document.removeEventListener('keydown',onKey);document.body.classList.remove('mobile-drawer-open')};
    },[]);
    async function signOut(){
      if(!window.confirm('Are you sure you want to sign out?'))return;
      onClose();
      await writeAuditEvent('User Logout','Authentication',profile.id,{login_id:profile.login_id},'Success');
      await client.auth.signOut();
    }
    return h('div',{className:'mobile-drawer-layer',role:'presentation',onClick:e=>{if(e.target===e.currentTarget)onClose()}},
      h('aside',{className:'mobile-nav-drawer',role:'dialog','aria-modal':'true','aria-label':'Samara Care mobile menu'},
        h('div',{className:'mobile-drawer-head'},
          h('div',{className:'mobile-drawer-brand'},h('div',{className:'mobile-brand-logo'},'SC'),h('div',null,h('strong',null,'Samara Care ERP'),h('small',null,`Version ${APP_VERSION}`))),
          h('button',{type:'button',className:'mobile-drawer-close',onClick:onClose,'aria-label':'Close menu'},'×')
        ),
        h('div',{className:'mobile-drawer-user'},h('strong',null,formalName(profile)),h('span',{className:'badge'},profile.role)),
        h('button',{type:'button',className:`mobile-drawer-home ${page===home?'active':''}`,onClick:()=>onNavigate(home)},'⌂  Dashboard'),
        h('div',{className:'mobile-drawer-scroll'},sections.map(section=>h('section',{className:'mobile-drawer-section',key:section.title},
          h('h4',null,section.title),
          section.items.map(item=>h('button',{type:'button',key:item,className:page===item?'active':'',onClick:()=>onNavigate(item)},displayNavLabel(item,profile.role)))
        ))),
        h('div',{className:'mobile-drawer-footer'},
          h('button',{type:'button',className:'mobile-signout-button',onClick:signOut},'⇥  Sign Out')
        )
      )
    );
  }

  function Dashboard({profile,onNavigate}){
    const [stats,setStats]=React.useState({employees:0,patients:0,beds:25,meds:0,care:0,outstanding:0,risks:0,incidents:0});
    React.useEffect(()=>{(async()=>{
      const today=new Date().toISOString().slice(0,10);
      const [emp,pat,med,care,bill,inc]=await Promise.all([
        client.from('profiles').select('*',{count:'exact',head:true}).eq('is_active',true),
        client.from('patients').select('*').eq('is_active',true),
        client.from('medication_administrations').select('*',{count:'exact',head:true}).eq('scheduled_date',today),
        client.from('care_logs').select('*',{count:'exact',head:true}).eq('care_date',today),
        client.from('billing_transactions').select('amount,transaction_type'),
        client.from('incidents').select('*',{count:'exact',head:true}).eq('status','Open')
      ]);
      const patients=pat.data||[];
      const risks=patients.filter(p=>p.fall_risk||p.pressure_sore_risk||p.aspiration_risk||p.wandering_risk||p.infection_risk||p.oxygen_required).length;
      const outstanding=(bill.data||[]).reduce((a,x)=>a+(x.transaction_type==='Charge'?Number(x.amount||0):-Number(x.amount||0)),0);
      setStats({employees:emp.count||0,patients:patients.length,beds:25,meds:med.count||0,care:care.count||0,outstanding,risks,incidents:inc.count||0});
    })()},[]);
    const cards=[
      {label:'Current patients',value:stats.patients,page:'Patients',icon:'👥'},
      {label:'Available beds',value:Math.max(0,stats.beds-stats.patients),page:'Rooms & Beds',icon:'🛏️'},
      {label:'High-risk patients',value:stats.risks,page:'Patients',icon:'⚠️'},
      {label:'Active employees',value:stats.employees,page:'Employees',icon:'🧑‍⚕️'},
      {label:'Medicine actions today',value:stats.meds,page:'Shift Tasks',icon:'💊'},
      {label:'Care actions today',value:stats.care,page:'Daily Care',icon:'✅'},
      {label:'Open incidents',value:stats.incidents,page:'Incidents',icon:'🚨'},
      {label:'Outstanding amount',value:`₹${stats.outstanding.toLocaleString('en-IN')}`,page:'Billing & Payments',icon:'₹'}
    ];
    return h(React.Fragment,null,
      h('div',{className:'shift-summary'},h('div',null,h('strong',null,currentShift()),h('span',null,'Admin and Manager control dashboard')),h('span',{className:'badge'},formalName(profile))),
      h('div',{className:'grid stats dashboard-links'},cards.map(card=>h('button',{type:'button',className:'card stat dashboard-card',key:card.label,onClick:()=>onNavigate(card.page),title:`Open ${card.page}`},h('span',{className:'dashboard-icon','aria-hidden':'true'},card.icon),h('span',null,card.label),h('strong',null,card.value),h('small',null,`Open ${card.page} →`)))),
      h('div',{className:'grid two',style:{marginTop:'18px'}},
        h('button',{type:'button',className:'card panel dashboard-panel-link',onClick:()=>onNavigate('Shift Tasks')},h('div',{className:'panel-head'},h('h3',null,'Today’s operational focus')),h('p',null,'Open medicines, bathing, restroom assistance, feeding, mobility, physiotherapy and special-nurse tasks.'),h('span',{className:'badge'},'Open Shift Tasks →')),
        h('button',{type:'button',className:'card panel dashboard-panel-link',onClick:()=>onNavigate('Reports')},h('div',{className:'panel-head'},h('h3',null,'Management reports')),h('p',null,'Open occupancy, clinical risks, incidents, billing, collections and outstanding details.'),h('span',{className:'badge'},'Open Reports →'))
      )
    );
  }

  function Employees({profile}){
    const [rows,setRows]=React.useState([]),[authMap,setAuthMap]=React.useState({}),[show,setShow]=React.useState(false),[busy,setBusy]=React.useState(false),[msg,setMsg]=React.useState('');
    const [resetTarget,setResetTarget]=React.useState(null),[newPassword,setNewPassword]=React.useState(''),[confirmPassword,setConfirmPassword]=React.useState(''),[resetBusy,setResetBusy]=React.useState(false),[resetMsg,setResetMsg]=React.useState('');
    const [repairTarget,setRepairTarget]=React.useState(null),[repairPassword,setRepairPassword]=React.useState(''),[repairBusy,setRepairBusy]=React.useState(false),[repairMsg,setRepairMsg]=React.useState('');
    const [detailsTarget,setDetailsTarget]=React.useState(null),[detailsForm,setDetailsForm]=React.useState(null),[detailsDocs,setDetailsDocs]=React.useState([]),[detailsBusy,setDetailsBusy]=React.useState(false),[detailsMsg,setDetailsMsg]=React.useState('');
    const [idFiles,setIdFiles]=React.useState([]),[qualificationFiles,setQualificationFiles]=React.useState([]),[experienceFiles,setExperienceFiles]=React.useState([]),[otherFiles,setOtherFiles]=React.useState([]),[cameraFiles,setCameraFiles]=React.useState([]),[photoFiles,setPhotoFiles]=React.useState([]),[photoPreview,setPhotoPreview]=React.useState(''),[welcomeLink,setWelcomeLink]=React.useState('');
    const [cameraConfig,setCameraConfig]=React.useState(null);
    const [employeeToast,setEmployeeToast]=React.useState(null);
    const employeeToastTimer=React.useRef(null);
    function showEmployeeToast(type,text){
      clearTimeout(employeeToastTimer.current);
      setEmployeeToast({type,text});
      employeeToastTimer.current=setTimeout(()=>setEmployeeToast(null),4500);
    }
    React.useEffect(()=>()=>clearTimeout(employeeToastTimer.current),[]);

    function updatePhotoSelection(files){
      const next=Array.from(files||[]).slice(0,1);
      setPhotoFiles(next);
      setPhotoPreview(current=>{
        if(current&&current.startsWith('blob:')) URL.revokeObjectURL(current);
        return next[0]?URL.createObjectURL(next[0]):'';
      });
    }

    React.useEffect(()=>()=>{
      if(photoPreview&&photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    },[photoPreview]);
    const empty={title:'',full_name:'',employee_id:'',designation:'',mobile:'',emergency_contact:'',role:'Caregiver',login_id:'',employee_email:'',password:'',father_guardian_name:'',address:'',date_of_birth:'',date_of_joining:'',blood_group:'',id_card_type:'Aadhaar',id_card_number:'',qualification:'',previous_workplace:'',reference_type:'Direct',reference_name:'',reference_contact:''};
    const [form,setForm]=React.useState(empty);

    async function adminRequest(payload){
      const {data:{session}}=await client.auth.getSession();
      if(!session)throw new Error('Your session has expired. Please sign in again.');
      const response=await fetch(`${cfg.supabaseUrl}/functions/v1/admin-users`,{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`,'apikey':cfg.supabasePublishableKey},
        body:JSON.stringify(payload)
      });
      const result=await response.json().catch(()=>({error:'Unable to read server response'}));
      if(!response.ok)throw new Error(result.error||'Unable to complete the request');
      return result;
    }

    async function load(){
      const {data,error}=await client.from('profiles').select('*').order('created_at',{ascending:false});
      if(error){setMsg(error.message||'Unable to load employees');return}
      setRows(data||[]);
      try{
        const result=await adminRequest({action:'auth_status'});
        const map={};(result.users||[]).forEach(u=>{map[u.id]=u});setAuthMap(map);
      }catch(error){console.error(error);setMsg(error.message||'Unable to load Authentication Status')}
    }
    React.useEffect(()=>{load();const ch=client.channel('profiles-live').on('postgres_changes',{event:'*',schema:'public',table:'profiles'},load).subscribe();return()=>client.removeChannel(ch)},[]);

    async function persistEmployeePhotoPath(profileOrAuthId,path){
      if(!profileOrAuthId||!path)return null;
      const payload={photo_storage_path:path,employee_photo_path:path,updated_at:new Date().toISOString()};
      let result=await client.from('profiles').update(payload).or(`id.eq.${profileOrAuthId},auth_user_id.eq.${profileOrAuthId}`).select('*');
      if(result.error){
        // Some earlier schemas do not contain updated_at or employee_photo_path.
        const fallback={photo_storage_path:path};
        result=await client.from('profiles').update(fallback).or(`id.eq.${profileOrAuthId},auth_user_id.eq.${profileOrAuthId}`).select('*');
      }
      if(result.error)throw new Error(`Employee photo could not be linked to the profile: ${result.error.message}`);
      if(!result.data?.length)throw new Error('Employee photo was uploaded, but no matching employee profile could be updated.');
      return result.data[0];
    }

    async function resolveEmployeePhoto(rowOrId,expiresIn=900){
      const seed=typeof rowOrId==='object'&&rowOrId?rowOrId:{id:rowOrId};
      const profileId=seed.id||seed.auth_user_id;
      if(!profileId)return {path:'',url:'',profile:seed};

      let current=seed;
      const {data:freshProfile}=await client.from('profiles').select('*').or(`id.eq.${profileId},auth_user_id.eq.${profileId}`).maybeSingle();
      if(freshProfile)current=freshProfile;

      let path=current.photo_storage_path||current.employee_photo_path||'';
      const candidateIds=[current.id,current.auth_user_id,seed.id,seed.auth_user_id].filter(Boolean);

      if(!path&&candidateIds.length){
        const uniqueIds=[...new Set(candidateIds)];
        const {data:docs,error:docsError}=await client.from('employee_documents')
          .select('*')
          .or(`employee_id.in.(${uniqueIds.join(',')}),profile_id.in.(${uniqueIds.join(',')})`)
          .order('created_at',{ascending:false});
        if(docsError)console.error('Unable to resolve employee photo document:',docsError);
        const photoDoc=(docs||[]).find(doc=>{
          const type=String(doc.document_type||doc.category||doc.document_name||'').trim().toLowerCase();
          return type==='employee photo'||type==='employee photograph'||type.includes('employee photo');
        });
        path=photoDoc?.storage_path||photoDoc?.file_path||'';

        if(path){
          try{
            const repaired=await persistEmployeePhotoPath(current.id||profileId,path);
            current=repaired||{...current,photo_storage_path:path,employee_photo_path:path};
          }catch(error){
            console.warn(error);
            current={...current,photo_storage_path:path,employee_photo_path:path};
          }
        }
      }

      if(!path)return {path:'',url:'',profile:current};
      const {data,error}=await client.storage.from('employee-documents').createSignedUrl(path,expiresIn);
      if(error||!data?.signedUrl){
        console.error('Unable to create employee photo URL:',error);
        return {path,url:'',profile:current};
      }
      const joiner=data.signedUrl.includes('?')?'&':'?';
      return {path,url:`${data.signedUrl}${joiner}t=${Date.now()}`,profile:{...current,photo_storage_path:path,employee_photo_path:path}};
    }

    async function uploadEmployeeFiles(userId,groups){
      for(const group of groups){
        for(const file of group.files||[]){
          const safe=String(file.name||'document').replace(/[^a-zA-Z0-9._-]/g,'_');
          const path=`${userId}/${Date.now()}-${Math.random().toString(36).slice(2,8)}-${safe}`;
          const {error:uploadError}=await client.storage.from('employee-documents').upload(path,file,{upsert:false,contentType:file.type||undefined});
          if(uploadError)throw new Error(`Unable to upload ${file.name}: ${uploadError.message}`);
          const {error:docError}=await client.from('employee_documents').insert({employee_id:userId,profile_id:userId,category:group.type||'Other Certificate',document_type:group.type||'Other Certificate',document_name:file.name||group.type||'Employee Document',file_name:file.name,storage_path:path,file_path:path,mime_type:file.type||null,file_size:file.size||null,uploaded_by:profile.id});
          if(docError)throw new Error(`Document record could not be saved: ${docError.message}`);
        }
      }
    }

    async function pruneEmployeePhotos(profileId,keepCount=3){
      if(!profileId)return;
      const {data:photos,error}=await client.from('employee_documents')
        .select('id,storage_path,file_path,created_at,document_type,category')
        .or(`employee_id.eq.${profileId},profile_id.eq.${profileId}`)
        .order('created_at',{ascending:false});
      if(error){console.warn('Unable to check old employee photos:',error);return}
      const employeePhotos=(photos||[]).filter(doc=>{
        const type=String(doc.document_type||doc.category||'').trim().toLowerCase();
        return type==='employee photo'||type==='employee photograph';
      });
      const oldPhotos=employeePhotos.slice(keepCount);
      if(!oldPhotos.length)return;

      const paths=[...new Set(oldPhotos.map(doc=>doc.storage_path||doc.file_path).filter(Boolean))];
      if(paths.length){
        const {error:storageError}=await client.storage.from('employee-documents').remove(paths);
        if(storageError){
          console.warn('Unable to delete one or more old employee photo files:',storageError);
          return; // Keep database rows when the matching Storage cleanup fails.
        }
      }
      const ids=oldPhotos.map(doc=>doc.id).filter(Boolean);
      if(ids.length){
        const {error:deleteError}=await client.from('employee_documents').delete().in('id',ids);
        if(deleteError)console.warn('Unable to delete old employee photo records:',deleteError);
      }
    }

    async function uploadEmployeePhoto(userId,files){
      const file=(files||[])[0];
      if(!file)return null;
      const safe=String(file.name||'employee-photo.jpg').replace(/[^a-zA-Z0-9._-]/g,'_');
      const path=`${userId}/profile-${Date.now()}-${safe}`;
      const {error:uploadError}=await client.storage.from('employee-documents').upload(path,file,{upsert:false,contentType:file.type||'image/jpeg'});
      if(uploadError)throw new Error(`Unable to upload employee photo: ${uploadError.message}`);

      const linkedProfile=await persistEmployeePhotoPath(userId,path);
      const profileId=linkedProfile?.id||userId;
      const photoRecord={
        employee_id:profileId,
        profile_id:profileId,
        category:'Employee Photo',
        document_type:'Employee Photo',
        document_name:'Employee Photo',
        file_name:file.name||'Employee Photo',
        storage_path:path,
        file_path:path,
        mime_type:file.type||'image/jpeg',
        file_size:file.size||null,
        uploaded_by:profile.id,
        created_at:new Date().toISOString(),
        updated_at:new Date().toISOString()
      };
      const {error:docError}=await client.from('employee_documents').insert(photoRecord);
      if(docError){
        await client.storage.from('employee-documents').remove([path]);
        throw new Error(`Employee photo record could not be saved: ${docError.message}`);
      }

      // Retain only the newest three Employee Photo records/files. Other document types are untouched.
      await pruneEmployeePhotos(profileId,3);

      const resolved=await resolveEmployeePhoto(linkedProfile||{...detailsTarget,id:profileId,photo_storage_path:path},900);
      if(resolved.url)setPhotoPreview(resolved.url);
      setRows(current=>current.map(row=>row.id===profileId?{...row,photo_storage_path:path,employee_photo_path:path}:row));
      if(detailsTarget?.id===profileId)setDetailsTarget(current=>current?{...current,photo_storage_path:path,employee_photo_path:path}:current);
      return path;
    }

    async function create(e){
      e.preventDefault();setBusy(true);setMsg('');setWelcomeLink('');
      const preopened=form.mobile?window.open('about:blank','_blank'):null;
      try{
        let employeeForm={...form};
        if(!String(employeeForm.employee_id||'').trim()){
          const {data:generatedId,error:idError}=await client.rpc('next_employee_code');
          if(idError)throw idError;
          employeeForm.employee_id=generatedId;
        }
        const result=await adminRequest({action:'create_or_repair',...employeeForm});
        // Enforce and verify the selected role through the protected server function.
        const roleResult=await adminRequest({action:'set_role',user_id:result.user_id,role:employeeForm.role});
        if(roleResult.role!==employeeForm.role)throw new Error(`Selected role ${employeeForm.role} was not saved correctly.`);
        await uploadEmployeePhoto(result.user_id,photoFiles);
        await uploadEmployeeFiles(result.user_id,[
          {type:'ID Card',files:idFiles},{type:'Qualification Certificate',files:qualificationFiles},{type:'Experience Certificate',files:experienceFiles},{type:'Other Certificate',files:otherFiles},{type:'Camera Capture',files:cameraFiles}
        ]);
        const createdRow={...employeeForm,id:result.user_id};
        const link=whatsappWelcomeUrl(createdRow,employeeForm.password);setWelcomeLink(link);
        if(preopened&&link){preopened.location.href=link}else if(preopened){preopened.close()}
        await load();
        const successText=result.repaired?'Employee account repaired and personnel details saved successfully.':'Employee created successfully with personnel details. The employee can sign in immediately.';
        setMsg(successText);showEmployeeToast('success',successText);
        setForm(empty);setIdFiles([]);setQualificationFiles([]);setExperienceFiles([]);setOtherFiles([]);setCameraFiles([]);setPhotoFiles([]);setPhotoPreview('');
      }catch(error){
        if(preopened)preopened.close();
        const errorText=error.message||'Unable to create employee';
        setMsg(errorText);showEmployeeToast('error',errorText);
      }
      setBusy(false);
    }

    async function toggle(row){try{await adminRequest({action:'toggle',user_id:row.id,is_active:!(row.is_active??row.active)});await load()}catch(error){alert(error.message||'Unable to update employee')}}
    function openReset(row){setResetTarget(row);setNewPassword('');setConfirmPassword('');setResetMsg('')}
    function generateTemporaryPassword(){
      const upper='ABCDEFGHJKLMNPQRSTUVWXYZ',lower='abcdefghijkmnopqrstuvwxyz',digits='23456789',symbols='@#$%';
      const pick=set=>set[Math.floor(Math.random()*set.length)];
      let value=pick(upper)+pick(lower)+pick(lower)+pick(digits)+pick(digits)+pick(symbols)+pick(upper)+pick(lower)+pick(digits)+pick(lower);
      value=value.split('').sort(()=>Math.random()-.5).join('');setNewPassword(value);setConfirmPassword(value);setResetMsg('Temporary password generated. Copy it safely before completing the reset.');
    }
    async function resetPassword(e){
      e.preventDefault();setResetMsg('');
      if(newPassword.length<8){setResetMsg('Password must contain at least 8 characters.');return}
      if(newPassword!==confirmPassword){setResetMsg('The two passwords do not match.');return}
      setResetBusy(true);
      try{await adminRequest({action:'reset_password',user_id:resetTarget.id,password:newPassword});setResetMsg('Password reset successfully. The employee account has also been enabled.');await load();setTimeout(()=>setResetTarget(null),900)}catch(error){setResetMsg(error.message||'Unable to reset password')}
      setResetBusy(false);
    }
    function openRepair(row){setRepairTarget(row);setRepairPassword('');setRepairMsg('')}
    async function repairAccount(e){
      e.preventDefault();setRepairMsg('');
      if(repairPassword.length<8){setRepairMsg('Temporary password must contain at least 8 characters.');return}
      setRepairBusy(true);
      try{await adminRequest({action:'repair_account',profile_id:repairTarget.id,password:repairPassword});setRepairMsg('Authentication account repaired successfully. The employee can now sign in.');await load();setTimeout(()=>setRepairTarget(null),1000)}catch(error){setRepairMsg(error.message||'Unable to repair the account')}
      setRepairBusy(false);
    }

    async function openDetails(row){
      setDetailsTarget(row);setDetailsForm({...empty,...row,password:''});setDetailsMsg('');setDetailsDocs([]);
      setIdFiles([]);setQualificationFiles([]);setExperienceFiles([]);setOtherFiles([]);setCameraFiles([]);setPhotoFiles([]);
      setPhotoPreview('');

      const resolved=await resolveEmployeePhoto(row,900);
      if(resolved.profile){
        setDetailsTarget(resolved.profile);
        setDetailsForm({...empty,...resolved.profile,password:''});
      }
      if(resolved.url)setPhotoPreview(resolved.url);

      const ids=[resolved.profile?.id,resolved.profile?.auth_user_id,row.id,row.auth_user_id].filter(Boolean);
      let docs=[];
      for(const id of [...new Set(ids)]){
        const {data}=await client.from('employee_documents').select('*').eq('employee_id',id).order('created_at',{ascending:false});
        if(data?.length)docs.push(...data);
        const {data:byProfile}=await client.from('employee_documents').select('*').eq('profile_id',id).order('created_at',{ascending:false});
        if(byProfile?.length)docs.push(...byProfile);
      }
      docs=docs.filter((doc,index,array)=>array.findIndex(x=>x.id===doc.id)===index).sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
      setDetailsDocs(docs);
    }

    async function saveDetails(e){
      e.preventDefault();setDetailsBusy(true);setDetailsMsg('');
      try{
        const payload={...detailsForm};delete payload.password;delete payload.id;delete payload.created_at;delete payload.updated_at;delete payload.last_sign_in_at;
        const requestedRole=payload.role;
        delete payload.role;
        const {error}=await client.from('profiles').update(payload).or(`id.eq.${detailsTarget.id},auth_user_id.eq.${detailsTarget.auth_user_id||detailsTarget.id}`);if(error)throw error;
        const roleResult=await adminRequest({action:'set_role',user_id:detailsTarget.id,role:requestedRole});
        if(roleResult.role!==requestedRole)throw new Error(`Selected role ${requestedRole} was not saved correctly.`);
        await uploadEmployeePhoto(detailsTarget.id,photoFiles);
        await uploadEmployeeFiles(detailsTarget.id,[{type:'ID Card',files:idFiles},{type:'Qualification Certificate',files:qualificationFiles},{type:'Experience Certificate',files:experienceFiles},{type:'Other Certificate',files:otherFiles},{type:'Camera Capture',files:cameraFiles}]);
        const successText='Employee information and documents updated successfully.';
        setDetailsMsg(successText);showEmployeeToast('success',successText);setIdFiles([]);setQualificationFiles([]);setExperienceFiles([]);setOtherFiles([]);setCameraFiles([]);setPhotoFiles([]);await load();
        const {data}=await client.from('employee_documents').select('*').eq('employee_id',detailsTarget.id).order('created_at',{ascending:false});setDetailsDocs(data||[]);
        const resolved=await resolveEmployeePhoto(detailsTarget,900);
        if(resolved.profile)setDetailsTarget(resolved.profile);
        if(resolved.url)setPhotoPreview(resolved.url);
      }catch(error){
        const errorText=error.message||'Unable to update employee';
        setDetailsMsg(errorText);showEmployeeToast('error',errorText);
      }
      setDetailsBusy(false);
    }
    async function openDocument(doc){
      const {data,error}=await client.storage.from('employee-documents').createSignedUrl(doc.storage_path,120);
      if(error){alert(error.message);return}window.open(data.signedUrl,'_blank','noopener');
    }

    async function printIdCard(row){
      const resolved=await resolveEmployeePhoto(row,900);
      const currentRow=resolved.profile||row;
      const photoUrl=resolved.url||'';
      const win=window.open('','_blank','width=760,height=700');
      if(!win){alert('Please allow pop-ups to print the ID card.');return}
      const validUntil=currentRow.date_of_joining?formatDateIN(new Date(new Date(currentRow.date_of_joining).setFullYear(new Date(currentRow.date_of_joining).getFullYear()+3))):'As per employment';
      win.document.write(`<!doctype html><html><head><title>Employee ID Card</title><style>body{font-family:Arial;margin:0;padding:30px;background:#eef6f4}.card{width:360px;height:570px;margin:auto;background:white;border-radius:24px;overflow:hidden;box-shadow:0 12px 35px #0002;border:2px solid #086b58}.head{background:#086b58;color:white;text-align:center;padding:22px}.head h1{margin:0;font-size:25px}.head p{margin:6px 0 0}.photo{width:130px;height:150px;border:4px solid white;border-radius:16px;object-fit:cover;background:#ddd;margin:-4px auto 16px;display:block;box-shadow:0 4px 15px #0003}.body{padding:16px 28px;text-align:center}.name{font-size:25px;font-weight:bold;color:#063f36}.role{font-size:18px;color:#086b58;margin:5px}.grid{text-align:left;margin-top:18px;line-height:1.75}.label{font-weight:bold;color:#555}.foot{position:absolute}.barcode{margin-top:15px;padding:10px;border-top:1px dashed #aaa;font-family:monospace}.print{display:block;margin:20px auto;padding:12px 24px}@media print{.print{display:none}body{background:white;padding:0}}</style></head><body><div class="card"><div class="head"><h1>SAMARA HEALTH CARE LLP</h1><p>Assisted Living Management System</p></div><div class="body">${photoUrl?`<img class="photo" src="${photoUrl}">`:`<div class="photo" style="display:flex;align-items:center;justify-content:center;font-size:48px">SC</div>`}<div class="name">${escapeHtml(formalName(currentRow))}</div><div class="role">${escapeHtml(currentRow.designation||currentRow.role)}</div><div class="grid"><div><span class="label">Employee ID:</span> ${escapeHtml(currentRow.employee_id||'—')}</div><div><span class="label">Role:</span> ${escapeHtml(currentRow.role||'—')}</div><div><span class="label">Mobile:</span> ${escapeHtml(currentRow.mobile||'—')}</div><div><span class="label">Blood Group:</span> ${escapeHtml(currentRow.blood_group||'—')}</div><div><span class="label">Date of Joining:</span> ${escapeHtml(currentRow.date_of_joining||'—')}</div><div><span class="label">Valid:</span> ${escapeHtml(validUntil)}</div></div><div class="barcode">${escapeHtml(currentRow.login_id||currentRow.id)}</div></div></div><button class="print" onclick="window.print()">Print ID Card</button></body></html>`);
      win.document.close();
    }

    function authenticationStatus(row){const auth=authMap[row.auth_user_id||row.id];if(!auth)return {text:'Auth user missing',className:'off'};if(auth.banned)return {text:'Blocked',className:'off'};if(!auth.confirmed)return {text:'Unconfirmed',className:'warn'};return {text:'Connected',className:'on'}}
    const fileInput=(label,setter,accept='application/pdf,image/*',isPhoto=false)=>h('div',{className:'field capture-field'},
      h('label',null,label),
      h('div',{className:'capture-actions'},
        h('label',{className:'btn btn-secondary file-button'},'Upload File',h('input',{type:'file',multiple:!isPhoto,accept,onChange:e=>isPhoto?updatePhotoSelection(e.target.files):setter(Array.from(e.target.files||[]))})),
        h('label',{className:'btn btn-secondary file-button'},'Mobile Camera',h('input',{type:'file',multiple:!isPhoto,accept:'image/*',capture:isPhoto?'user':'environment',onChange:e=>isPhoto?updatePhotoSelection(e.target.files):setter(prev=>[...prev,...Array.from(e.target.files||[])])})),
        h('button',{type:'button',className:'btn btn-secondary',onClick:()=>setCameraConfig({title:label,facingMode:isPhoto?'user':'environment',filePrefix:isPhoto?'employee-photo':'document',onCapture:file=>isPhoto?updatePhotoSelection([file]):setter(prev=>[...prev,file])})},'Webcam')
      ),
      h('small',null,'Choose an existing file, use the mobile camera, or open the live webcam capture.'),
      h('div',{className:'selected-files'},isPhoto?(photoFiles[0]?`Selected: ${photoFiles[0].name}`:'No photo selected'):null)
    );
    const textArea=(label,key,state,setter,required=false)=>h('div',{className:'field span-2'},h('label',null,label),h('textarea',{value:state[key]||'',required,onChange:e=>setter({...state,[key]:e.target.value}),rows:3}));

    const table=h('div',{className:'table-wrap'},h('table',{className:'table'},
      h('thead',null,h('tr',null,['Name','Employee ID','Login ID','Role','Profile Status','Authentication Status','Last sign-in','Actions'].map(x=>h('th',{key:x},x)))),
      h('tbody',null,rows.map(r=>{const enabled=Boolean(r.is_active??r.active),auth=authMap[r.auth_user_id||r.id],status=authenticationStatus(r),managerBlocked=profile.role==='Manager'&&String(r.role).toLowerCase()==='admin';return h('tr',{key:r.id},
        h('td',null,formalName(r)),h('td',null,r.employee_id||'—'),h('td',null,r.login_id),h('td',null,r.role),
        h('td',null,h('span',{className:`badge ${enabled?'':'off'}`},enabled?'Active':'Disabled')),
        h('td',null,h('span',{className:`badge auth-status ${status.className}`},status.text)),h('td',null,fmt(auth?.last_sign_in_at||r.last_sign_in_at)),
        h('td',null,h('div',{className:'employee-actions'},h('button',{className:'btn btn-secondary',onClick:()=>openDetails(r)},'Personnel File'),h('button',{className:'btn btn-secondary',onClick:()=>openDetails(r)},'Documents'),h('button',{className:'btn btn-secondary',onClick:()=>printIdCard(r)},'Print ID Card'),r.mobile?h('a',{className:'btn btn-whatsapp',href:whatsappWelcomeUrl(r),target:'_blank',rel:'noopener'},'WhatsApp Welcome'):null,h('button',{className:enabled?'btn btn-danger':'btn btn-secondary',disabled:managerBlocked,onClick:()=>toggle(r)},enabled?'Disable':'Enable'),auth?h('button',{className:'btn btn-primary',disabled:managerBlocked,onClick:()=>openReset(r)},'Reset Password'):h('button',{className:'btn btn-warning',disabled:managerBlocked,onClick:()=>openRepair(r)},'Repair Account')))
      )}),rows.length===0?h('tr',null,h('td',{colSpan:8,className:'empty'},'No employees found')):null))
    );

    const personnelFields=(state,setter,includeLogin=true)=>h(React.Fragment,null,
      selectField('Title / Salutation','title',state,setter,EMPLOYEE_TITLES),field('Employee Name','full_name',state,setter,true),field('Employee ID (auto-generated if blank)','employee_id',state,setter,false),field('Designation','designation',state,setter,false),selectField('Role','role',state,setter,ROLES),
      field('Father / Guardian Name','father_guardian_name',state,setter,false),field('Date of Birth','date_of_birth',state,setter,false,'date'),field('Date of Joining','date_of_joining',state,setter,false,'date'),field('Blood Group','blood_group',state,setter,false),
      field('Mobile Number','mobile',state,setter,false),field('Emergency Contact','emergency_contact',state,setter,false),field('Employee Email','employee_email',state,setter,false,'email'),
      field('ID Card Type','id_card_type',state,setter,false),field('ID Card Number','id_card_number',state,setter,false),field('Qualification','qualification',state,setter,false),field('Previous Working Place','previous_workplace',state,setter,false),
      selectField('Joining Source','reference_type',state,setter,['Direct','Reference']),field('Reference Name','reference_name',state,setter,false),field('Reference Contact','reference_contact',state,setter,false),
      includeLogin?field('Login ID','login_id',state,setter,true):null,includeLogin?field('Temporary Password','password',state,setter,true,'password'):null,textArea('Residential Address','address',state,setter,false)
    );

    const uploadFields=()=>h('div',{className:'employee-upload-section span-2'},h('h4',null,'Employee Photo, Documents and Certificates'),h('p',{className:'small-note'},'Each item provides separate Upload File, Mobile Camera and Webcam options.'),h('div',{className:'modal-grid'},fileInput('Employee Photo',setPhotoFiles,'image/*',true),fileInput('ID Card / Identity Proof',setIdFiles),fileInput('Qualification Certificates',setQualificationFiles),fileInput('Experience / Previous Employment Certificates',setExperienceFiles),fileInput('Other Certificates',setOtherFiles)));

    const personnelPhotoPreview=()=>h('div',{className:'employee-form-photo',style:{width:'116px',height:'136px',borderRadius:'16px',overflow:'hidden',border:'2px solid #d7e7e2',background:'#eef6f4',display:'flex',alignItems:'center',justifyContent:'center',flex:'0 0 auto'}},
      photoPreview?h('img',{src:photoPreview,alt:'Employee photo preview',style:{width:'100%',height:'100%',objectFit:'cover'}}):h('div',{style:{fontSize:'34px',fontWeight:'700',color:'#086b58'}},'SC')
    );

    const createModal=show?h('div',{className:'modal-backdrop'},h('form',{className:'card modal employee-modal',onSubmit:create},
      h('div',{className:'panel-head',style:{alignItems:'flex-start'}},h('div',null,h('h3',null,'Create Employee'),h('small',null,'Personnel details, login account and certificate uploads')),h('div',{style:{display:'flex',gap:'12px',alignItems:'flex-start'}},personnelPhotoPreview(),h('button',{type:'button',className:'close',onClick:()=>{setShow(false);setPhotoPreview('');setPhotoFiles([])}},'×'))),
      msg?h('div',{className:`message ${msg.startsWith('Employee created')||msg.startsWith('Employee account repaired')?'success':'error'}`},msg):null,
      welcomeLink&&h('a',{className:'btn btn-whatsapp full',href:welcomeLink,target:'_blank',rel:'noopener'},'Send Welcome Message on WhatsApp'),
      h('div',{className:'modal-grid'},personnelFields(form,setForm,true),uploadFields()),h('p',{className:'message success'},'The login account is created and confirmed securely without sending an email.'),h('button',{className:'btn btn-primary full',disabled:busy},busy?'Creating employee and uploading documents…':'Create Employee')
    )):null;

    const detailsModal=detailsTarget&&detailsForm?h('div',{className:'modal-backdrop'},h('form',{className:'card modal employee-modal',onSubmit:saveDetails},
      h('div',{className:'panel-head',style:{alignItems:'flex-start'}},h('div',null,h('h3',null,'Employee Personnel File'),h('small',null,`${formalName(detailsTarget)} · ${detailsTarget.login_id}`)),h('div',{style:{display:'flex',gap:'12px',alignItems:'flex-start'}},personnelPhotoPreview(),h('button',{type:'button',className:'close',onClick:()=>{setDetailsTarget(null);setPhotoPreview('');setPhotoFiles([])}},'×'))),
      detailsMsg&&h('div',{className:`message ${detailsMsg.startsWith('Employee information')?'success':'error'}`},detailsMsg),
      h('div',{className:'modal-grid'},personnelFields(detailsForm,setDetailsForm,false),uploadFields()),
      h('div',{className:'employee-doc-list'},h('h4',null,'Uploaded Documents'),detailsDocs.length?detailsDocs.map(d=>h('div',{className:'document-row',key:d.id},h('span',null,`${d.document_type}: ${d.file_name}`),h('button',{type:'button',className:'btn btn-secondary',onClick:()=>openDocument(d)},'Open'))):h('p',{className:'small-note'},'No documents uploaded yet.')),
      h('button',{className:'btn btn-primary full',disabled:detailsBusy},detailsBusy?'Saving…':'Save Employee Information')
    )):null;

    const resetModal=resetTarget?h('div',{className:'modal-backdrop'},h('form',{className:'card modal reset-password-modal',onSubmit:resetPassword},h('div',{className:'panel-head'},h('div',null,h('h3',null,'Reset Employee Password'),h('small',null,`${resetTarget.full_name} · ${resetTarget.login_id}`)),h('button',{type:'button',className:'close',onClick:()=>setResetTarget(null)},'×')),resetMsg&&h('div',{className:`message ${resetMsg.startsWith('Password reset')?'success':'error'}`},resetMsg),h('div',{className:'field'},h('label',null,'New password'),h('input',{type:'password',value:newPassword,onChange:e=>setNewPassword(e.target.value),minLength:8,required:true,autoComplete:'new-password'})),h('div',{className:'field'},h('label',null,'Confirm new password'),h('input',{type:'password',value:confirmPassword,onChange:e=>setConfirmPassword(e.target.value),minLength:8,required:true,autoComplete:'new-password'})),h('button',{type:'button',className:'btn btn-secondary full',onClick:generateTemporaryPassword},'Generate Temporary Password'),h('p',{className:'small-note'},'Resetting the password also enables and unblocks the employee account. The employee must create a private password at first login.'),h('button',{className:'btn btn-primary full',disabled:resetBusy},resetBusy?'Resetting…':'Reset Password & Enable Account'))):null;
    const repairModal=repairTarget?h('div',{className:'modal-backdrop'},h('form',{className:'card modal reset-password-modal',onSubmit:repairAccount},h('div',{className:'panel-head'},h('div',null,h('h3',null,'Repair Employee Account'),h('small',null,`${repairTarget.full_name} · ${repairTarget.login_id}`)),h('button',{type:'button',className:'close',onClick:()=>setRepairTarget(null)},'×')),repairMsg&&h('div',{className:`message ${repairMsg.startsWith('Authentication account repaired')?'success':'error'}`},repairMsg),h('p',null,'This employee has a profile but no matching Supabase Authentication account. Enter a temporary password to rebuild the login account.'),h('div',{className:'field'},h('label',null,'Temporary password'),h('input',{type:'password',value:repairPassword,onChange:e=>setRepairPassword(e.target.value),minLength:8,required:true,autoComplete:'new-password'})),h('button',{className:'btn btn-warning full',disabled:repairBusy},repairBusy?'Repairing…':'Repair Account & Enable Login'))):null;

    return h(React.Fragment,null,
      h('div',{className:'card panel'},h('div',{className:'panel-head'},h('div',null,h('h3',null,'Employees'),h('small',null,'Personnel records, documents, central login accounts and Authentication status')),h('button',{className:'btn btn-primary',onClick:()=>{setShow(true);setMsg('')}},'Create Employee')),msg&&!show?h('div',{className:'message error'},msg):null,table),
      createModal,detailsModal,resetModal,repairModal,
      cameraConfig?h(CameraCaptureModal,{config:cameraConfig,onClose:()=>setCameraConfig(null)}):null,
      employeeToast&&h('div',{className:`samara-toast ${employeeToast.type}`,role:'status','aria-live':'polite'},
        h('span',{className:'samara-toast-icon','aria-hidden':'true'},employeeToast.type==='success'?'✓':'!'),
        h('div',null,
          h('strong',null,employeeToast.type==='success'?'Employee update successful':'Employee update failed'),
          h('span',null,employeeToast.text)
        ),
        h('button',{type:'button','aria-label':'Close notification',onClick:()=>setEmployeeToast(null)},'×')
      )
    );
  }


  function Enquiries({profile}){
    const [rows,setRows]=React.useState([]),[form,setForm]=React.useState({patient_name:'',family_contact_name:'',family_contact_phone:'',current_location:'Home',reason_for_enquiry:'',expected_admission_date:'',bed_preference:'',special_requirements:'',source:'Direct',status:'New'});
    async function load(){const {data}=await client.from('pre_admission_enquiries').select('*').order('created_at',{ascending:false});setRows(data||[])}React.useEffect(()=>{load()},[]);
    async function save(e){e.preventDefault();const {error}=await client.from('pre_admission_enquiries').insert({...form,handled_by:profile.id});if(error)return alert(error.message);setForm({...form,patient_name:'',family_contact_name:'',family_contact_phone:'',reason_for_enquiry:'',special_requirements:''});load()}
    async function status(id,value){await client.from('pre_admission_enquiries').update({status:value,updated_at:new Date().toISOString()}).eq('id',id);load()}
    return h(React.Fragment,null,h(Section,{title:'Pre-Admission Enquiry',subtitle:'Track enquiries, assessments, estimates and bed reservations'},h('form',{className:'modal-grid',onSubmit:save},miniInput('Patient name',form.patient_name,v=>setForm({...form,patient_name:v}),true),miniInput('Family contact',form.family_contact_name,v=>setForm({...form,family_contact_name:v}),true),miniInput('Phone',form.family_contact_phone,v=>setForm({...form,family_contact_phone:v}),true,'tel'),miniSelect('Current location',form.current_location,['Home','Hospital','Clinic','Other Care Centre'],v=>setForm({...form,current_location:v})),miniSelect('Source',form.source,['Direct','Hospital','Doctor','Reference','Website','Other'],v=>setForm({...form,source:v})),miniInput('Expected admission',form.expected_admission_date,v=>setForm({...form,expected_admission_date:v}),false,'date'),miniInput('Bed preference',form.bed_preference,v=>setForm({...form,bed_preference:v})),miniInput('Reason for enquiry',form.reason_for_enquiry,v=>setForm({...form,reason_for_enquiry:v}),true),miniInput('Special requirements',form.special_requirements,v=>setForm({...form,special_requirements:v})),h('button',{className:'btn btn-primary'},'Save Enquiry'))),h(LogTable,{title:'Enquiry Register',heads:['Patient','Family Contact','Location','Expected Date','Status','Action'],rows:rows.map(r=>[r.patient_name,`${r.family_contact_name} · ${r.family_contact_phone}`,r.current_location,r.expected_admission_date||'—',r.status,h('select',{value:r.status,onChange:e=>status(r.id,e.target.value)},['New','Assessment Scheduled','Estimate Sent','Bed Reserved','Converted to Admission','Closed'].map(x=>h('option',{key:x},x)))])}))
  }


  const MEDICATION_TIME_OPTIONS = Array.from({length:24},(_,hour)=>({
    value:`${String(hour).padStart(2,'0')}:00`,
    label:`${hour===0?12:hour>12?hour-12:hour}:00 ${hour<12?'AM':'PM'}`
  }));
  const MEDICATION_FREQUENCY_TIMES = {
    'Once Daily (OD)':['08:00'],
    'Twice Daily (BD)':['08:00','20:00'],
    'Three Times Daily (TDS)':['06:00','14:00','22:00'],
    'Four Times Daily (QID)':['06:00','12:00','18:00','22:00'],
    'HS':['22:00'],
    'STAT':[]
  };
  function normalizeMedicationTime(value){
    const text=String(value||'').trim();
    if(!text)return '';
    if(/^\d{2}:\d{2}$/.test(text))return text;
    const match=text.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
    if(!match)return text;
    let hour=Number(match[1])%12;if(match[3].toUpperCase()==='PM')hour+=12;
    return `${String(hour).padStart(2,'0')}:${match[2]||'00'}`;
  }
  function medicationTimeLabel(value){
    const normalized=normalizeMedicationTime(value);const hour=Number(normalized.slice(0,2));
    if(Number.isNaN(hour))return String(value||'');
    return `${hour===0?12:hour>12?hour-12:hour}:${normalized.slice(3,5)||'00'} ${hour<12?'AM':'PM'}`;
  }
  function MedicationTimeSelector({label,value,onChange,required=false}){
    const selected=String(value||'').split(',').map(normalizeMedicationTime).filter(Boolean);
    const [open,setOpen]=React.useState(false);
    const [draft,setDraft]=React.useState(selected);
    React.useEffect(()=>{if(!open)setDraft(selected)},[value,open]);
    function openPicker(){setDraft(selected);setOpen(true)}
    function toggle(time){setDraft(current=>current.includes(time)?current.filter(x=>x!==time):[...current,time].sort())}
    function confirm(){onChange(draft.join(', '));setOpen(false)}
    function reset(){setDraft([])}
    function cancel(){setDraft(selected);setOpen(false)}
    return h('div',{className:'field medication-time-field'},
      h('label',null,label),
      h('button',{type:'button',className:'time-picker-trigger',onClick:openPicker,'aria-expanded':open},
        h('span',{className:selected.length?'time-picker-value':'time-picker-placeholder'},selected.length?selected.map(medicationTimeLabel).join(' • '):'Select time'),
        h('span',{className:'time-picker-caret'},'▾')
      ),
      selected.length?h('div',{className:'time-chip-list'},selected.map(time=>h('span',{className:'time-chip',key:time},medicationTimeLabel(time),h('button',{type:'button','aria-label':`Remove ${medicationTimeLabel(time)}`,onClick:()=>onChange(selected.filter(x=>x!==time).join(', '))},'×')))):null,
      open?h('div',{className:'time-picker-backdrop',onMouseDown:e=>{if(e.target===e.currentTarget)cancel()}},
        h('div',{className:'time-picker-popup',role:'dialog','aria-modal':'true','aria-label':'Select medication time'},
          h('div',{className:'time-picker-head'},h('div',null,h('h4',null,'Select Time'),h('small',null,'Choose one or more medicine times')),h('button',{type:'button',className:'close',onClick:cancel},'×')),
          h('div',{className:'time-picker-grid'},MEDICATION_TIME_OPTIONS.map(opt=>h('button',{type:'button',className:`time-picker-option ${draft.includes(opt.value)?'selected':''}`,key:opt.value,onClick:()=>toggle(opt.value)},opt.label))),
          h('div',{className:'time-picker-actions'},h('button',{type:'button',className:'btn btn-secondary',onClick:reset},'Reset'),h('button',{type:'button',className:'btn btn-secondary',onClick:cancel},'Cancel'),h('button',{type:'button',className:'btn btn-primary',onClick:confirm},'OK'))
        )
      ):null,
      required&&selected.length===0?h('small',{className:'field-hint error-text'},'Select at least one time'):null
    );
  }

  function blankMedicine(){
    return {
      medicine_name:'',
      strength:'',
      dose:'',
      route:'Oral',
      food_instruction:'After food',
      times:'08:00',
      frequency:'Once Daily (OD)',
      duration:'Long Term',
      custom_duration_days:'',
      start_date:new Date().toISOString().slice(0,10),
      special_instruction:''
    };
  }

  function blankCare(){
    return {
      care_type:'',
      shift:'Both shifts',
      frequency:'Daily',
      instruction:''
    };
  }

  function Admissions({profile}){
    const today=new Date().toISOString().slice(0,10);
    const initial={admission_type:'Hospital Discharge',patient_category:'Short Stay',title:'',full_name:'',age:'',gender:'Male',mobile:'',address:'',room_no:'',bed_no:'',admission_date:today,hospital_name:'',discharge_date:today,diagnosis:'',treating_doctor:'',doctor_phone:'',referring_doctor:'',referring_source:'',family_doctor:'',attendant_name:'',attendant_phone:'',allergies:'',special_instructions:'',diet_plan:'Normal diet',feeding_instruction:'',billing_package:'Standard Assisted Care',fall_risk:false,pressure_sore_risk:false,aspiration_risk:false,wandering_risk:false,infection_risk:false,seizure_history:false,oxygen_required:false,oxygen_instruction:'',dressing_required:false,dressing_instruction:'',special_nurse_required:false,special_nurse_name:'',special_nurse_shift:'Both shifts / 24-hour coverage',special_nurse_instructions:'',physio_required:false,therapy_type:'',physiotherapist_name:'',physio_frequency:'Daily',physio_time:'10:00',physio_precautions:''};
    const [form,setForm]=React.useState(initial),[meds,setMeds]=React.useState([blankMedicine()]),[care,setCare]=React.useState([blankCare()]),[busy,setBusy]=React.useState(false),[msg,setMsg]=React.useState('');
    const [photoFiles,setPhotoFiles]=React.useState([]),[idFiles,setIdFiles]=React.useState([]),[dischargeFiles,setDischargeFiles]=React.useState([]),[prescriptionFiles,setPrescriptionFiles]=React.useState([]),[reportFiles,setReportFiles]=React.useState([]),[cameraConfig,setCameraConfig]=React.useState(null),[patientPhotoPreview,setPatientPhotoPreview]=React.useState('');
    const [roomBeds,setRoomBeds]=React.useState([]);
    React.useEffect(()=>{
      let active=true;
      async function loadRoomBeds(){
        const {data,error}=await client.from('room_beds').select('*').order('room_no').order('bed_code');
        if(!active)return;
        if(error){
          console.error('Unable to load Room & Bed Master:',error);
          setRoomBeds([]);
          return;
        }
        setRoomBeds(data||[]);
      }
      loadRoomBeds();
      const channel=client.channel('admission-room-beds-live')
        .on('postgres_changes',{event:'*',schema:'public',table:'room_beds'},loadRoomBeds)
        .subscribe();
      return()=>{active=false;client.removeChannel(channel)};
    },[]);
    const careTemplates=['Bathing assistance','Restroom/toileting assistance','Oral hygiene','Dressing assistance','Feeding assistance','Walking/mobility assistance','Diaper change','Position change / bedsore prevention','Fluid intake monitoring','Sleep assistance'];
    const riskItems=[['fall_risk','Fall risk'],['pressure_sore_risk','Pressure sore risk'],['aspiration_risk','Aspiration risk'],['wandering_risk','Wandering / confusion risk'],['infection_risk','Infection-control precautions'],['seizure_history','Seizure history']];
    const needsHospital=form.admission_type==='Hospital Discharge'||form.admission_type==='Hospital Transfer';
    const needsReferral=form.admission_type==='Doctor Referral';
    function updateRow(setter,rows,i,key,value){setter(rows.map((r,n)=>n===i?{...r,[key]:value}:r))}
    function addCareTemplate(name){if(care.some(x=>x.care_type===name))return;setCare([...care,{...blankCare(),care_type:name}])}
    function setCapturedFiles(setter,isPhoto,file){
      setter(prev=>isPhoto?[file]:[...(prev||[]),file]);
      if(isPhoto){
        if(patientPhotoPreview)URL.revokeObjectURL(patientPhotoPreview);
        setPatientPhotoPreview(URL.createObjectURL(file));
      }
    }
    function patientCaptureInput(label,files,setter,accept='image/*,.pdf',isPhoto=false){
      return h('div',{className:'field capture-field'},
        h('label',null,label),
        h('div',{className:'capture-actions'},
          h('label',{className:'btn btn-secondary file-button'},'Upload File',h('input',{type:'file',multiple:!isPhoto,accept,onChange:e=>{const picked=Array.from(e.target.files||[]);setter(isPhoto?picked.slice(0,1):picked);if(isPhoto&&picked[0]){if(patientPhotoPreview)URL.revokeObjectURL(patientPhotoPreview);setPatientPhotoPreview(URL.createObjectURL(picked[0]))}}})),
          h('label',{className:'btn btn-secondary file-button'},'Mobile Camera',h('input',{type:'file',multiple:!isPhoto,accept:'image/*',capture:isPhoto?'user':'environment',onChange:e=>{const picked=Array.from(e.target.files||[]);setter(prev=>isPhoto?picked.slice(0,1):[...(prev||[]),...picked]);if(isPhoto&&picked[0]){if(patientPhotoPreview)URL.revokeObjectURL(patientPhotoPreview);setPatientPhotoPreview(URL.createObjectURL(picked[0]))}}})),
          h('button',{type:'button',className:'btn btn-secondary',onClick:()=>setCameraConfig({title:label,facingMode:isPhoto?'user':'environment',filePrefix:isPhoto?'patient-photo':'patient-document',onCapture:file=>setCapturedFiles(setter,isPhoto,file)})},'Webcam')
        ),
        isPhoto&&patientPhotoPreview?h('img',{src:patientPhotoPreview,className:'patient-capture-preview',alt:'Patient preview'}):null,
        h('small',null,files?.length?`${files.length} file(s) selected`:'Choose an existing file, use the mobile camera, or open the webcam.')
      );
    }
    async function uploadPatientFile(patientId,file,type,isPhoto=false){
      const safe=String(file.name||type).replace(/[^a-zA-Z0-9._-]/g,'_');
      const path=`${patientId}/${Date.now()}-${Math.random().toString(36).slice(2,8)}-${safe}`;
      const {error:up}=await client.storage.from('patient-documents').upload(path,file,{upsert:false,contentType:file.type||undefined});if(up)throw up;
      const {error:doc}=await client.from('patient_documents').insert({patient_id:patientId,document_type:type,document_name:file.name||type,storage_path:path,mime_type:file.type||null,file_size:file.size||null,uploaded_by:profile.id,is_verified:true});if(doc)throw doc;
      if(isPhoto){const {error:e}=await client.from('patients').update({photo_storage_path:path}).eq('id',patientId);if(e)throw e}
    }
    async function submit(e){
      e.preventDefault();setBusy(true);setMsg('');
      if(isFutureDateIndia(form.admission_date)){setMsg(`Admission date cannot be later than today (${formatDateIN(todayISOIndia())}). Please correct the date.`);setBusy(false);return}
      if(!photoFiles.length){setMsg('Capture or upload the patient photograph before admission.');setBusy(false);return}
      if(!idFiles.length){setMsg('Upload at least one patient identity document.');setBusy(false);return}
      if(needsHospital&&!dischargeFiles.length){setMsg('Upload the hospital discharge summary or transfer note.');setBusy(false);return}
      if((needsHospital||needsReferral)&&!prescriptionFiles.length){setMsg('Upload the current prescription.');setBusy(false);return}
      if(!meds.length||meds.some(m=>!m.medicine_name||!m.strength||!m.times)){setMsg('Enter every current medicine, strength and administration time.');setBusy(false);return}
      if(form.special_nurse_required&&!form.special_nurse_name){setMsg('Assign or enter the special nurse name.');setBusy(false);return}
      const {data:{user}}=await client.auth.getUser();
      const {data:patientCode,error:patientCodeError}=await client.rpc('next_patient_code');
      if(patientCodeError){setMsg(patientCodeError.message);setBusy(false);return}
      const payload={...form,patient_id:patientCode,age:Number(form.age)||null,created_by:user.id,is_active:true,admission_status:'Active',prescription_verified:true,prescription_verified_by:user.id,prescription_verified_at:new Date().toISOString()};
      ['physio_required','therapy_type','physiotherapist_name','physio_frequency','physio_time','physio_precautions'].forEach(k=>delete payload[k]);
      const {data:patient,error}=await client.from('patients').insert(payload).select().single();if(error){setMsg(error.message);setBusy(false);return}
      try{
        await uploadPatientFile(patient.id,photoFiles[0],'Patient Photo',true);
        for(const f of idFiles)await uploadPatientFile(patient.id,f,'Identity Proof');
        for(const f of dischargeFiles)await uploadPatientFile(patient.id,f,needsHospital?'Discharge / Transfer Summary':'Medical History');
        for(const f of prescriptionFiles)await uploadPatientFile(patient.id,f,'Current Prescription');
        for(const f of reportFiles)await uploadPatientFile(patient.id,f,'Medical / Test Report');
        const medRows=meds.map(m=>{const start=m.start_date||new Date().toISOString().slice(0,10);const durationDays=m.duration==='Custom'?Number(m.custom_duration_days||0):({'Single Dose':0,'1 Day':1,'3 Days':3,'5 Days':5,'7 Days':7,'10 Days':10,'14 Days':14,'21 Days':21,'30 Days':30}[m.duration]??null);let endDate=null;if(durationDays!==null){const d=new Date(`${start}T00:00:00`);d.setDate(d.getDate()+Math.max(durationDays-1,0));endDate=d.toISOString().slice(0,10)}return {patient_id:patient.id,medicine_name:m.medicine_name,strength:m.strength,dose:m.strength,route:m.route,food_instruction:m.food_instruction,special_instruction:m.special_instruction,scheduled_times:m.times.split(',').map(x=>x.trim()).filter(Boolean),frequency:m.frequency,duration:m.duration,duration_days:m.duration==='Custom'?Number(m.custom_duration_days||0):durationDays,start_date:start,end_date:endDate,entered_by:user.id,verified_by:user.id}});
        await client.from('medication_orders').insert(medRows);
        const careRows=care.filter(c=>c.care_type).map(c=>({...c,patient_id:patient.id,entered_by:user.id}));if(careRows.length)await client.from('care_orders').insert(careRows);
        if(form.physio_required&&form.therapy_type)await client.from('physiotherapy_plans').insert({patient_id:patient.id,advised_by:form.treating_doctor||form.referring_doctor,therapy_type:form.therapy_type,physiotherapist_name:form.physiotherapist_name||null,frequency:form.physio_frequency,preferred_time:form.physio_time,precautions:form.physio_precautions,start_date:form.admission_date,entered_by:user.id});
        await client.from('audit_log').insert({user_id:user.id,action:'PATIENT_ADMISSION_COMPLETED',entity:'patients',entity_id:patient.id,details:{admission_type:form.admission_type,category:form.patient_category}});
        setMsg('Admission completed. Patient photo, documents, medicines and care plan are active.');setForm(initial);setMeds([blankMedicine()]);setCare([blankCare()]);setPhotoFiles([]);setIdFiles([]);setDischargeFiles([]);setPrescriptionFiles([]);setReportFiles([]);if(patientPhotoPreview)URL.revokeObjectURL(patientPhotoPreview);setPatientPhotoPreview('');
      }catch(err){setMsg('Patient created, but document or care setup failed: '+err.message)}
      setBusy(false);
    }
    return h('form',{className:'card panel',onSubmit:submit},
      h('div',{className:'panel-head'},h('div',null,h('h3',null,'Unified Patient Admission'),h('small',null,'Hospital discharge, direct admission, doctor referral or transfer'))),
      msg&&h('div',{className:`message ${msg.startsWith('Admission')?'success':'error'}`},msg),
      h('div',{className:'section-card'},h('h4',null,'1. Admission route and patient identity'),h('div',{className:'form-grid'},
        selectField('Admission type','admission_type',form,setForm,['Hospital Discharge','Direct Admission','Doctor Referral','Hospital Transfer']),
        selectField('Patient category','patient_category',form,setForm,['Short Stay','Respite Care','Post-Surgery','Rehabilitation','Stroke Recovery','Dementia Care','Parkinsonism','Palliative Care','Long-Term Assisted Living','Observation','Elderly Care']),
        selectField('Title / Salutation','title',form,setForm,PATIENT_TITLES),field('Patient name','full_name',form,setForm,true),field('Age','age',form,setForm,false,'number'),selectField('Gender','gender',form,setForm,['Male','Female','Other']),field('Mobile','mobile',form,setForm,false,'tel'),textareaField('Address','address',form,setForm,'span-2'),field('Family / attendant name','attendant_name',form,setForm,true),field('Attendant phone','attendant_phone',form,setForm,true,'tel')
      ),h('div',{className:'upload-grid'},patientCaptureInput('Patient Photo',photoFiles,setPhotoFiles,'image/*',true),patientCaptureInput('Identity Proof',idFiles,setIdFiles,'image/*,.pdf',false))),
      h('div',{className:'section-card'},h('h4',null,'2. Medical source and records'),h('div',{className:'form-grid'},
        needsHospital&&field('Hospital / previous centre','hospital_name',form,setForm,true),needsHospital&&field('Discharge / transfer date','discharge_date',form,setForm,true,'date'),
        needsReferral&&field('Referring doctor','referring_doctor',form,setForm,true),needsReferral&&field('Clinic / referral source','referring_source',form,setForm,false),
        form.admission_type==='Direct Admission'&&field('Family doctor','family_doctor',form,setForm,false),field('Diagnosis / current condition','diagnosis',form,setForm,true),field('Treating doctor','treating_doctor',form,setForm,false),field('Doctor contact','doctor_phone',form,setForm,false,'tel'),field('Known allergies','allergies',form,setForm,false),textareaField('Instructions / precautions','special_instructions',form,setForm,'span-2')
      ),h('div',{className:'upload-grid'},patientCaptureInput('Discharge / Transfer / Previous Medical Record',dischargeFiles,setDischargeFiles,'image/*,.pdf',false),patientCaptureInput('Current Prescription',prescriptionFiles,setPrescriptionFiles,'image/*,.pdf',false),patientCaptureInput('Lab, Scan and Other Reports',reportFiles,setReportFiles,'image/*,.pdf',false))),
      h('div',{className:'section-card'},h('div',{className:'section-title'},h('h4',null,'3. Current medicines and prescription verification'),h('button',{type:'button',className:'btn btn-secondary',onClick:()=>setMeds([...meds,blankMedicine()])},'Add medicine')),meds.map((m,i)=>h('div',{className:'repeat-row medicine-order-row',key:i},miniInput('Medicine',m.medicine_name,v=>updateRow(setMeds,meds,i,'medicine_name',v),true),miniInput('Strength',m.strength,v=>updateRow(setMeds,meds,i,'strength',v),true),miniSelect('Frequency',m.frequency,['Once Daily (OD)','Twice Daily (BD)','Three Times Daily (TDS)','Four Times Daily (QID)','HS','STAT','SOS / PRN','Weekly','Monthly'],v=>{const next=meds.map((row,n)=>n===i?{...row,frequency:v,times:(MEDICATION_FREQUENCY_TIMES[v]||String(row.times||'').split(',').map(normalizeMedicationTime).filter(Boolean)).join(', ')}:row);setMeds(next)}),miniSelect('Route',m.route,['Oral','IV','IM'],v=>updateRow(setMeds,meds,i,'route',v)),h(MedicationTimeSelector,{label:'Time',value:m.times,onChange:v=>updateRow(setMeds,meds,i,'times',v),required:true}),miniSelect('Food',m.food_instruction,['Before food','After food','With food','No restriction'],v=>updateRow(setMeds,meds,i,'food_instruction',v)),miniSelect('Duration',m.duration,['Single Dose','1 Day','3 Days','5 Days','7 Days','10 Days','14 Days','21 Days','30 Days','Until Doctor Review','Long Term','Custom'],v=>updateRow(setMeds,meds,i,'duration',v)),m.duration==='Custom'&&miniInput('Custom days',m.custom_duration_days,v=>updateRow(setMeds,meds,i,'custom_duration_days',v),true,'number'),miniInput('Start date',m.start_date,v=>updateRow(setMeds,meds,i,'start_date',v),true,'date'),miniInput('Special instruction',m.special_instruction,v=>updateRow(setMeds,meds,i,'special_instruction',v)),h('button',{type:'button',className:'icon-btn',onClick:()=>setMeds(meds.filter((_,n)=>n!==i)),disabled:meds.length===1},'Remove')))),
      h('div',{className:'section-card'},h('h4',null,'4. Master care plan'),h('div',{className:'check-grid'},careTemplates.map(name=>h('label',{className:'check-card',key:name},h('input',{type:'checkbox',checked:care.some(x=>x.care_type===name),onChange:e=>e.target.checked?addCareTemplate(name):setCare(care.filter(x=>x.care_type!==name))}),h('span',null,name)))),care.map((c,i)=>h('div',{className:'repeat-row care',key:c.care_type+i},miniInput('Care task',c.care_type,v=>updateRow(setCare,care,i,'care_type',v),true),miniSelect('Shift',c.shift,['Day Shift (7 AM–7 PM)','Night Shift (7 PM–7 AM)','Both shifts'],v=>updateRow(setCare,care,i,'shift',v)),miniSelect('Frequency',c.frequency,['Daily','Each shift','Twice daily','As required'],v=>updateRow(setCare,care,i,'frequency',v)),miniInput('Instruction',c.instruction,v=>updateRow(setCare,care,i,'instruction',v)),h('button',{type:'button',className:'icon-btn',onClick:()=>setCare(care.filter((_,n)=>n!==i))},'Remove'))),h('div',{className:'form-grid'},selectField('Diet plan','diet_plan',form,setForm,['Normal diet','Soft diet','Liquid diet','Diabetic diet','Low-salt diet','Renal diet','High-protein diet','Tube feeding','Custom diet']),textareaField('Feeding instructions','feeding_instruction',form,setForm,'span-2'))),
      h('div',{className:'section-card'},h('h4',null,'5. Risks, special nurse and physiotherapy'),h('div',{className:'check-grid'},riskItems.map(([key,label])=>h('label',{className:'check-card',key},h('input',{type:'checkbox',checked:!!form[key],onChange:e=>setForm({...form,[key]:e.target.checked})}),h('span',null,label))),h('label',{className:'check-card'},h('input',{type:'checkbox',checked:form.oxygen_required,onChange:e=>setForm({...form,oxygen_required:e.target.checked})}),h('span',null,'Oxygen required')),h('label',{className:'check-card'},h('input',{type:'checkbox',checked:form.dressing_required,onChange:e=>setForm({...form,dressing_required:e.target.checked})}),h('span',null,'Wound dressing required')),h('label',{className:'check-card'},h('input',{type:'checkbox',checked:form.special_nurse_required,onChange:e=>setForm({...form,special_nurse_required:e.target.checked})}),h('span',null,'Special / dedicated nurse')),h('label',{className:'check-card'},h('input',{type:'checkbox',checked:form.physio_required,onChange:e=>setForm({...form,physio_required:e.target.checked})}),h('span',null,'Physiotherapy advised'))),form.special_nurse_required&&h('div',{className:'form-grid'},field('Special nurse name','special_nurse_name',form,setForm,true),selectField('Coverage','special_nurse_shift',form,setForm,['Day Shift','Night Shift','Both shifts / 24-hour coverage']),textareaField('Special nursing instructions','special_nurse_instructions',form,setForm,'span-2')),form.physio_required&&h('div',{className:'form-grid'},field('Therapy / exercise','therapy_type',form,setForm,true),field('Physiotherapist name','physiotherapist_name',form,setForm,false),field('Frequency','physio_frequency',form,setForm,false),field('Preferred time','physio_time',form,setForm,false,'time'),textareaField('Precautions','physio_precautions',form,setForm,'span-2'))),
      h('div',{className:'section-card'},h('h4',null,'6. Package, room and activation'),h('div',{className:'form-grid'},selectField('Package','billing_package',form,setForm,['Basic Care','Standard Assisted Care','High Dependency Care','Post-operative Care','Rehabilitation Care','Palliative Care','Rehabilitation Care','Custom Package']),roomBedSelect(roomBeds,form.room_no,form.bed_no,(room_no,bed_no)=>setForm({...form,room_no,bed_no}),true),field('Admission date','admission_date',form,setForm,true,'date'))),
      h('button',{className:'btn btn-primary full',disabled:busy},busy?'Completing admission…':'Complete Admission and Activate Care Plan'),
      cameraConfig?h(CameraCaptureModal,{config:cameraConfig,onClose:()=>setCameraConfig(null)}):null
    );
  }

  function ShiftTasks({profile}){
    const today=new Date().toISOString().slice(0,10);
    const [meds,setMeds]=React.useState([]),[medLogs,setMedLogs]=React.useState([]),[care,setCare]=React.useState([]),[careLogs,setCareLogs]=React.useState([]),[physio,setPhysio]=React.useState([]),[physioLogs,setPhysioLogs]=React.useState([]),[loading,setLoading]=React.useState(true);
    const patientFields='full_name,room_no,bed_no,special_nurse_required,special_nurse_name,special_nurse_shift,fall_risk,pressure_sore_risk,aspiration_risk,wandering_risk,infection_risk,seizure_history,oxygen_required,dressing_required';
    async function load(){setLoading(true);const [m,ml,c,cl,p,pl]=await Promise.all([
      client.from('medication_orders').select(`*,patients(${patientFields})`).eq('is_active',true),
      client.from('medication_administrations').select('*').eq('scheduled_date',today),
      client.from('care_orders').select(`*,patients(${patientFields})`).eq('is_active',true),
      client.from('care_logs').select('*').eq('care_date',today),
      client.from('physiotherapy_plans').select(`*,patients(${patientFields})`).eq('is_active',true),
      client.from('physiotherapy_sessions').select('*').eq('session_date',today)
    ]);setMeds(m.data||[]);setMedLogs(ml.data||[]);setCare(c.data||[]);setCareLogs(cl.data||[]);setPhysio(p.data||[]);setPhysioLogs(pl.data||[]);setLoading(false)}
    React.useEffect(()=>{load();const ch=client.channel('shift-live-v31').on('postgres_changes',{event:'*',schema:'public',table:'medication_administrations'},load).on('postgres_changes',{event:'*',schema:'public',table:'care_logs'},load).on('postgres_changes',{event:'*',schema:'public',table:'physiotherapy_sessions'},load).subscribe();return()=>client.removeChannel(ch)},[]);
    function riskBadges(p){const items=[[p.fall_risk,'Fall'],[p.pressure_sore_risk,'Pressure sore'],[p.aspiration_risk,'Aspiration'],[p.wandering_risk,'Wandering'],[p.infection_risk,'Infection'],[p.seizure_history,'Seizure'],[p.oxygen_required,'Oxygen'],[p.dressing_required,'Dressing']].filter(x=>x[0]);return items.length?h('div',{className:'risk-badges'},items.map(x=>h('span',{className:'risk-badge',key:x[1]},x[1]))):null}
    async function logMedicine(order,time,status){const {data:{user}}=await client.auth.getUser();const remarks=status==='Given'?'':prompt('Enter reason / remarks:')||'';const {error}=await client.from('medication_administrations').insert({order_id:order.id,patient_id:order.patient_id,scheduled_date:today,scheduled_time:time,status,administered_at:new Date().toISOString(),administered_by:user.id,remarks});if(error)alert(error.message);else load()}
    async function logCare(order,status){const {data:{user}}=await client.auth.getUser();const shift=currentShift();const remarks=status==='Completed'?'':prompt('Enter reason / remarks:')||'';const {error}=await client.from('care_logs').upsert({care_order_id:order.id,patient_id:order.patient_id,care_date:today,shift,status,completed_at:new Date().toISOString(),completed_by:user.id,remarks},{onConflict:'care_order_id,care_date,shift'});if(error)alert(error.message);else load()}
    async function logPhysio(order,status){const {data:{user}}=await client.auth.getUser();const notes=status==='Completed'?(prompt('Session notes (optional):')||''):(prompt('Reason / notes:')||'');const {error}=await client.from('physiotherapy_sessions').upsert({order_id:order.id,patient_id:order.patient_id,session_date:today,status,session_at:new Date().toISOString(),performed_by:user.id,notes},{onConflict:'order_id,session_date'});if(error)alert(error.message);else load()}
    const shift=currentShift();const medTasks=[];meds.forEach(o=>(o.scheduled_times||[]).forEach(t=>{const time=String(t).slice(0,5);if(shiftForTime(time)===shift)medTasks.push({order:o,time,log:medLogs.find(x=>x.order_id===o.id&&String(x.scheduled_time).slice(0,5)===time)})}));
    medTasks.sort((a,b)=>a.time.localeCompare(b.time));const careTasks=care.filter(o=>o.shift==='Both shifts'||o.shift===shift).map(o=>({...o,log:careLogs.find(x=>x.care_order_id===o.id&&x.shift===shift)}));
    const physioTasks=physio.filter(o=>!o.preferred_time||shiftForTime(String(o.preferred_time).slice(0,5))===shift).map(o=>({...o,log:physioLogs.find(x=>x.order_id===o.id)}));
    if(loading)return h('div',{className:'loading'},'Loading shift tasks…');
    const pending=medTasks.filter(x=>!x.log).length+careTasks.filter(x=>!x.log).length+physioTasks.filter(x=>!x.log).length;
    return h(React.Fragment,null,
      h('div',{className:'shift-summary'},h('div',null,h('strong',null,shift),h('span',null,`${today} · ${pending} total tasks pending`)),h('span',{className:'badge'},profile.full_name)),
      h('div',{className:'card panel task-group'},h('div',{className:'panel-head'},h('div',null,h('h3',null,"Today's Medication Administration"),h('small',null,'Prescription-led MAR')),h('span',{className:'badge'},`${medTasks.filter(x=>!x.log).length} pending`)),
        medTasks.map(x=>h('div',{className:`task-card ${x.log?'done':''}`,key:x.order.id+x.time},h('div',null,h('strong',null,`${x.order.patients.full_name} · Room ${x.order.patients.room_no}-${x.order.patients.bed_no}`),x.order.patients.special_nurse_required&&h('div',{className:'special-alert'},`Special nurse: ${x.order.patients.special_nurse_name||'Required'} · ${x.order.patients.special_nurse_shift||''}`),riskBadges(x.order.patients),h('div',{className:'task-meta'},`${x.order.medicine_name} ${x.order.strength||''} · ${x.order.dose} · ${x.order.route}`),x.order.special_instruction&&h('div',{className:'small-note'},x.order.special_instruction)),h('div',null,h('span',{className:'pill'},x.time),h('div',{className:'small-note'},x.order.food_instruction)),h('div',null,x.log?h('span',{className:'badge'},x.log.status):h('span',{className:'pill warning'},'Pending')),h('div',null,!x.log&&h(React.Fragment,null,h('button',{className:'btn btn-primary',onClick:()=>logMedicine(x.order,x.time,'Given')},'Given'),' ',h('button',{className:'btn btn-danger',onClick:()=>logMedicine(x.order,x.time,'Refused')},'Exception'))))),medTasks.length===0&&h('div',{className:'empty'},'No medication tasks in this shift')),
      h('div',{className:'card panel task-group'},h('div',{className:'panel-head'},h('div',null,h('h3',null,'Basic Care Tasks'),h('small',null,'Bath, restroom, hygiene, mobility and assistance')),h('span',{className:'badge'},`${careTasks.filter(x=>!x.log).length} pending`)),
        careTasks.map(x=>h('div',{className:`task-card ${x.log?'done':''}`,key:x.id},h('div',null,h('strong',null,`${x.patients.full_name} · ${x.care_type}`),x.patients.special_nurse_required&&h('div',{className:'special-alert'},`Special nurse: ${x.patients.special_nurse_name||'Required'} · ${x.patients.special_nurse_shift||''}`),riskBadges(x.patients),h('div',{className:'task-meta'},`Room ${x.patients.room_no}-${x.patients.bed_no} · ${x.frequency}`),x.instruction&&h('div',{className:'small-note'},x.instruction)),h('div',null,h('span',{className:'pill'},x.shift)),h('div',null,x.log?h('span',{className:'badge'},x.log.status):h('span',{className:'pill warning'},'Pending')),h('div',null,!x.log&&h(React.Fragment,null,h('button',{className:'btn btn-primary',onClick:()=>logCare(x,'Completed')},'Complete'),' ',h('button',{className:'btn btn-danger',onClick:()=>logCare(x,'Refused')},'Exception'))))),careTasks.length===0&&h('div',{className:'empty'},'No basic-care tasks in this shift')),
      h('div',{className:'card panel task-group'},h('div',{className:'panel-head'},h('div',null,h('h3',null,'Physiotherapy Tasks'),h('small',null,'Exercises and rehabilitation advised at discharge')),h('span',{className:'badge'},`${physioTasks.filter(x=>!x.log).length} pending`)),
        physioTasks.map(x=>h('div',{className:`task-card ${x.log?'done':''}`,key:x.id},h('div',null,h('strong',null,`${x.patients.full_name} · ${x.therapy_type}`),x.patients.special_nurse_required&&h('div',{className:'special-alert'},`Special nurse: ${x.patients.special_nurse_name||'Required'}`),riskBadges(x.patients),h('div',{className:'task-meta'},`Room ${x.patients.room_no}-${x.patients.bed_no} · ${x.frequency}`),x.precautions&&h('div',{className:'small-note'},x.precautions)),h('div',null,h('span',{className:'pill'},x.preferred_time?String(x.preferred_time).slice(0,5):shift)),h('div',null,x.log?h('span',{className:'badge'},x.log.status):h('span',{className:'pill warning'},'Pending')),h('div',null,!x.log&&h(React.Fragment,null,h('button',{className:'btn btn-primary',onClick:()=>logPhysio(x,'Completed')},'Complete'),' ',h('button',{className:'btn btn-danger',onClick:()=>logPhysio(x,'Postponed')},'Postpone'))))),physioTasks.length===0&&h('div',{className:'empty'},'No physiotherapy tasks in this shift'))
    );
  }

  function currentShift(){const h=new Date().getHours();return h>=7&&h<19?'Day Shift (7 AM–7 PM)':'Night Shift (7 PM–7 AM)'}
  function shiftForTime(value){const h=Number(String(value).slice(0,2));return h>=7&&h<19?'Day Shift (7 AM–7 PM)':'Night Shift (7 PM–7 AM)'}

  function Patients({profile}){
    const canEdit=['Admin','Manager'].includes(profile?.role);
    const clinicalView=CLINICAL_ROLES.includes(profile?.role);
    const [rows,setRows]=React.useState([]),[selected,setSelected]=React.useState(null),[details,setDetails]=React.useState(null),[photoUrl,setPhotoUrl]=React.useState(''),[tab,setTab]=React.useState('Overview');
    const [editTarget,setEditTarget]=React.useState(null),[editForm,setEditForm]=React.useState(null),[editBusy,setEditBusy]=React.useState(false),[editMsg,setEditMsg]=React.useState('');
    const [patientToast,setPatientToast]=React.useState(null);
    const patientToastTimer=React.useRef(null);
    function showPatientToast(type,text){
      clearTimeout(patientToastTimer.current);
      setPatientToast({type,text});
      patientToastTimer.current=setTimeout(()=>setPatientToast(null),4500);
    }
    React.useEffect(()=>()=>clearTimeout(patientToastTimer.current),[]);
    const [editMeds,setEditMeds]=React.useState([]),[editCare,setEditCare]=React.useState([]);
    const [editPhysio,setEditPhysio]=React.useState({
      required:false,
      id:null,
      therapy_type:'',
      physiotherapist_name:'',
      frequency:'Daily',
      preferred_time:'10:00',
      precautions:'',
      advised_by:'',
      start_date:'',
      end_date:'',
      is_active:true
    });
    const [roomBeds,setRoomBeds]=React.useState([]);
    const [editDocs,setEditDocs]=React.useState([]),[editPhotoUrl,setEditPhotoUrl]=React.useState(''),[editCameraConfig,setEditCameraConfig]=React.useState(null);
    const [editUploads,setEditUploads]=React.useState({photo:[],identity:[],prescription:[],discharge:[],reports:[],other:[]});
    async function load(){const {data,error}=await client.from('patients').select('*').order('created_at',{ascending:false});if(error)console.error(error);setRows(data||[])}
    React.useEffect(()=>{const loadRooms=async()=>{const {data}=await client.from('room_beds').select('*').order('room_no').order('bed_no');setRoomBeds(data||[])};load();loadRooms();const ch=client.channel('patients-live').on('postgres_changes',{event:'*',schema:'public',table:'patients'},load).on('postgres_changes',{event:'*',schema:'public',table:'room_beds'},loadRooms).subscribe();return()=>client.removeChannel(ch)},[]);
    async function resolvePatientPhoto(p){
      let path=p.photo_storage_path||'';
      if(!path){
        const {data}=await client.from('patient_documents').select('storage_path').eq('patient_id',p.id).in('document_type',['Patient Photo','Patient Photograph']).order('created_at',{ascending:false}).limit(1).maybeSingle();
        path=data?.storage_path||'';
        if(path)await client.from('patients').update({photo_storage_path:path}).eq('id',p.id);
      }
      if(!path)return '';
      const {data}=await client.storage.from('patient-documents').createSignedUrl(path,900);
      return data?.signedUrl||'';
    }
    async function openPatient(p){
      setSelected(p);setPhotoUrl('');setTab('Overview');
      const [m,ma,c,cl,v,ph,ps,d,meal,bill,rec,inc,url]=await Promise.all([
        client.from('medication_orders').select('*').eq('patient_id',p.id).order('created_at',{ascending:false}),
        client.from('medication_administrations').select('*').eq('patient_id',p.id).order('scheduled_date',{ascending:false}).limit(100),
        client.from('care_orders').select('*').eq('patient_id',p.id).order('created_at',{ascending:false}),
        client.from('care_logs').select('*').eq('patient_id',p.id).order('created_at',{ascending:false}).limit(100),
        client.from('vital_signs').select('*').eq('patient_id',p.id).order('recorded_at',{ascending:false}).limit(100),
        client.from('physiotherapy_plans').select('*').eq('patient_id',p.id).order('created_at',{ascending:false}),
        client.from('physiotherapy_sessions').select('*').eq('patient_id',p.id).order('session_date',{ascending:false}).limit(100),
        client.from('patient_documents').select('*').eq('patient_id',p.id).order('created_at',{ascending:false}),
        client.from('meal_records').select('*').eq('patient_id',p.id).order('served_at',{ascending:false}).limit(100),
        client.from('billing_transactions').select('*').eq('patient_id',p.id).order('transaction_date',{ascending:false}).limit(200),
        client.from('recovery_events').select('*').eq('patient_id',p.id).order('event_at',{ascending:false}).limit(100),
        client.from('incidents').select('*').eq('patient_id',p.id).order('incident_at',{ascending:false}).limit(100),
        resolvePatientPhoto(p)
      ]);
      setDetails({meds:m.data||[],mar:ma.data||[],care:c.data||[],careLogs:cl.data||[],vitals:v.data||[],physio:ph.data||[],physioSessions:ps.data||[],docs:d.data||[],meals:meal.data||[],billing:bill.data||[],recovery:rec.data||[],incidents:inc.data||[]});
      setPhotoUrl(url);
    }
    async function openDoc(doc){if(doc.storage_path){const {data,error}=await client.storage.from('patient-documents').createSignedUrl(doc.storage_path,180);if(error)return alert(error.message);window.open(data.signedUrl,'_blank','noopener')}else if(doc.document_url)window.open(doc.document_url,'_blank','noopener')}
    async function loadEditMedia(row){
      const [{data:docs},url]=await Promise.all([
        client.from('patient_documents').select('*').eq('patient_id',row.id).order('created_at',{ascending:false}),
        resolvePatientPhoto(row)
      ]);
      setEditDocs(docs||[]);setEditPhotoUrl(url||'');
    }
    async function openEditPatient(row){
      setEditTarget(row);setEditMsg('');setEditUploads({photo:[],identity:[],prescription:[],discharge:[],reports:[],other:[]});setEditDocs([]);setEditPhotoUrl('');
      setEditForm({...row,
        title:row.title||'',full_name:row.full_name||'',age:row.age||'',gender:row.gender||'Male',mobile:row.mobile||'',address:row.address||'',
        attendant_name:row.attendant_name||'',attendant_phone:row.attendant_phone||'',diagnosis:row.diagnosis||'',
        referring_doctor:row.referring_doctor||'',treating_doctor:row.treating_doctor||'',doctor_phone:row.doctor_phone||'',
        hospital_name:row.hospital_name||'',admission_type:row.admission_type||'Direct Admission',patient_category:row.patient_category||'Short Stay',
        room_no:row.room_no||'',bed_no:row.bed_no||'',allergies:row.allergies||'',special_instructions:row.special_instructions||'',
        admission_date:row.admission_date||'',is_active:row.is_active!==false
      });
      const [{data:existingMeds},{data:existingCare},{data:existingPhysio}]=await Promise.all([
        client.from('medication_orders').select('*').eq('patient_id',row.id).order('created_at'),
        client.from('care_orders').select('*').eq('patient_id',row.id).order('created_at'),
        client.from('physiotherapy_plans').select('*').eq('patient_id',row.id).order('created_at',{ascending:false}).limit(1).maybeSingle()
      ]);
      setEditMeds((existingMeds||[]).map(m=>({...blankMedicine(),...m,times:Array.isArray(m.scheduled_times)?m.scheduled_times.join(', '):(m.times||''),custom_duration_days:m.duration_days||''})));
      setEditCare((existingCare||[]).map(c=>({...blankCare(),...c})));
      setEditPhysio(existingPhysio?{
        required:existingPhysio.is_active!==false,
        id:existingPhysio.id,
        therapy_type:existingPhysio.therapy_type||'',
        physiotherapist_name:existingPhysio.physiotherapist_name||'',
        frequency:existingPhysio.frequency||'Daily',
        preferred_time:existingPhysio.preferred_time||'10:00',
        precautions:existingPhysio.precautions||'',
        advised_by:existingPhysio.advised_by||row.treating_doctor||row.referring_doctor||'',
        start_date:existingPhysio.start_date||row.admission_date||todayISOIndia(),
        end_date:existingPhysio.end_date||'',
        is_active:existingPhysio.is_active!==false
      }:{
        required:false,id:null,therapy_type:'',physiotherapist_name:'',frequency:'Daily',preferred_time:'10:00',precautions:'',
        advised_by:row.treating_doctor||row.referring_doctor||'',start_date:row.admission_date||todayISOIndia(),end_date:'',is_active:true
      });
      await loadEditMedia(row);
    }
    function updateEditMed(i,key,value){setEditMeds(editMeds.map((m,n)=>n===i?{...m,[key]:value}:m))}
    function updateEditCare(i,key,value){setEditCare(editCare.map((c,n)=>n===i?{...c,[key]:value}:c))}
    function addEditFiles(key,files,replace=false){
      const picked=Array.from(files||[]);setEditUploads(prev=>({...prev,[key]:replace?picked.slice(0,1):[...(prev[key]||[]),...picked]}));
      if(key==='photo'&&picked[0]){if(editPhotoUrl&&editPhotoUrl.startsWith('blob:'))URL.revokeObjectURL(editPhotoUrl);setEditPhotoUrl(URL.createObjectURL(picked[0]))}
    }
    function editCaptureField(label,key,accept='image/*,.pdf',photo=false){
      const files=editUploads[key]||[];
      return h('div',{className:'field capture-field'},h('label',null,label),h('div',{className:'capture-actions'},
        h('label',{className:'btn btn-secondary file-button'},'Upload File',h('input',{type:'file',multiple:!photo,accept,onChange:e=>addEditFiles(key,e.target.files,photo)})),
        h('label',{className:'btn btn-secondary file-button'},'Mobile Camera',h('input',{type:'file',multiple:!photo,accept:'image/*',capture:photo?'user':'environment',onChange:e=>addEditFiles(key,e.target.files,photo)})),
        h('button',{type:'button',className:'btn btn-secondary',onClick:()=>setEditCameraConfig({title:label,facingMode:photo?'user':'environment',filePrefix:photo?'patient-photo':'patient-document',onCapture:file=>addEditFiles(key,[file],photo)})},'Webcam')
      ),h('small',null,files.length?`${files.length} new file(s) selected`:'No new file selected'));
    }
    async function uploadEditDocument(patientId,file,type,isPhoto=false){
      const safe=String(file.name||type).replace(/[^a-zA-Z0-9._-]/g,'_');const path=`${patientId}/${Date.now()}-${Math.random().toString(36).slice(2,8)}-${safe}`;
      const {error:up}=await client.storage.from('patient-documents').upload(path,file,{upsert:false,contentType:file.type||undefined});if(up)throw up;
      const {data:{user}}=await client.auth.getUser();
      const {error:doc}=await client.from('patient_documents').insert({patient_id:patientId,document_type:type,document_name:file.name||type,storage_path:path,mime_type:file.type||null,file_size:file.size||null,uploaded_by:user?.id||null,is_verified:true});if(doc)throw doc;
      if(isPhoto){const {error:pe}=await client.from('patients').update({photo_storage_path:path}).eq('id',patientId);if(pe)throw pe}
    }
    async function deleteEditDocument(doc){
      if(!confirm(`Delete ${doc.document_name||doc.document_type||'this document'}?`))return;
      if(doc.storage_path){const {error:se}=await client.storage.from('patient-documents').remove([doc.storage_path]);if(se)return alert(se.message)}
      const {error}=await client.from('patient_documents').delete().eq('id',doc.id);if(error)return alert(error.message);
      if(['Patient Photo','Patient Photograph'].includes(doc.document_type)){const next=editDocs.find(x=>x.id!==doc.id&&['Patient Photo','Patient Photograph'].includes(x.document_type));await client.from('patients').update({photo_storage_path:next?.storage_path||null}).eq('id',editTarget.id)}
      await loadEditMedia(editTarget);await load();
    }
    async function savePatientEdit(e){
      e.preventDefault();setEditBusy(true);setEditMsg('');
      if(isFutureDateIndia(editForm.admission_date)){const text=`Admission date cannot be later than today (${formatDateIN(todayISOIndia())}). Please correct the date.`;setEditMsg(text);showPatientToast('error',text);setEditBusy(false);return}
      const allowed=['title','full_name','age','gender','mobile','address','attendant_name','attendant_phone','diagnosis','referring_doctor','treating_doctor','doctor_phone','hospital_name','admission_type','patient_category','room_no','bed_no','allergies','special_instructions','admission_date','is_active','diet_plan','feeding_instruction','fall_risk','pressure_sore_risk','aspiration_risk','wandering_risk','infection_risk','seizure_history','special_nurse_required','special_nurse_name','special_nurse_shift'];
      const payload={};allowed.forEach(k=>payload[k]=editForm[k]===''?null:editForm[k]);payload.age=editForm.age===''?null:Number(editForm.age);
      const {data,error}=await client.from('patients').update(payload).eq('id',editTarget.id).select().single();
      if(error){const text=error.message||'Unable to update patient';setEditMsg(text);showPatientToast('error',text);setEditBusy(false);return}
      try{
        for(const f of editUploads.photo)await uploadEditDocument(editTarget.id,f,'Patient Photo',true);
        for(const f of editUploads.identity)await uploadEditDocument(editTarget.id,f,'Identity Proof');
        for(const f of editUploads.prescription)await uploadEditDocument(editTarget.id,f,'Current Prescription');
        for(const f of editUploads.discharge)await uploadEditDocument(editTarget.id,f,'Discharge / Transfer Summary');
        for(const f of editUploads.reports)await uploadEditDocument(editTarget.id,f,'Lab / Scan / Test Report');
        for(const f of editUploads.other)await uploadEditDocument(editTarget.id,f,'Other Medical Document');
      }catch(uploadError){const text=`Patient details saved, but media upload failed: ${uploadError.message}`;setEditMsg(text);showPatientToast('error',text);setEditBusy(false);return}
      try{
        const {data:{user}}=await client.auth.getUser();
        await client.from('medication_orders').delete().eq('patient_id',editTarget.id);
        const medicationRows=editMeds.filter(m=>m.medicine_name).map(m=>{const start=m.start_date||new Date().toISOString().slice(0,10);const days=m.duration==='Custom'?Number(m.custom_duration_days||0):({'Single Dose':0,'1 Day':1,'3 Days':3,'5 Days':5,'7 Days':7,'10 Days':10,'14 Days':14,'21 Days':21,'30 Days':30}[m.duration]??null);let endDate=null;if(days!==null){const d=new Date(`${start}T00:00:00`);d.setDate(d.getDate()+Math.max(days-1,0));endDate=d.toISOString().slice(0,10)}return {patient_id:editTarget.id,medicine_name:m.medicine_name,strength:m.strength,dose:m.strength,route:m.route,food_instruction:m.food_instruction,special_instruction:m.special_instruction,scheduled_times:String(m.times||'').split(',').map(x=>x.trim()).filter(Boolean),frequency:m.frequency,duration:m.duration,duration_days:m.duration==='Custom'?Number(m.custom_duration_days||0):days,start_date:start,end_date:endDate,entered_by:user?.id||null,verified_by:user?.id||null}});
        if(medicationRows.length){const {error:me}=await client.from('medication_orders').insert(medicationRows);if(me)throw me}
        await client.from('care_orders').delete().eq('patient_id',editTarget.id);
        const careRows=editCare.filter(c=>c.care_type).map(c=>({patient_id:editTarget.id,care_type:c.care_type,shift:c.shift,frequency:c.frequency,instruction:c.instruction||null,entered_by:user?.id||null}));
        if(careRows.length){const {error:ce}=await client.from('care_orders').insert(careRows);if(ce)throw ce}

        if(editPhysio.required){
          if(!editPhysio.therapy_type.trim())throw new Error('Please enter the therapy or exercise advised.');
          const physioPayload={
            patient_id:editTarget.id,
            advised_by:editPhysio.advised_by||editForm.treating_doctor||editForm.referring_doctor||null,
            therapy_type:editPhysio.therapy_type.trim(),
            physiotherapist_name:editPhysio.physiotherapist_name||null,
            frequency:editPhysio.frequency||'Daily',
            preferred_time:editPhysio.preferred_time||null,
            precautions:editPhysio.precautions||null,
            start_date:editPhysio.start_date||editForm.admission_date||todayISOIndia(),
            end_date:editPhysio.end_date||null,
            is_active:true,
            entered_by:user?.id||null,
            updated_at:new Date().toISOString()
          };
          if(editPhysio.id){
            const {error:pe}=await client.from('physiotherapy_plans').update(physioPayload).eq('id',editPhysio.id);
            if(pe)throw pe;
          }else{
            const {data:newPlan,error:pe}=await client.from('physiotherapy_plans').insert(physioPayload).select('id').single();
            if(pe)throw pe;
            if(newPlan?.id)setEditPhysio(current=>({...current,id:newPlan.id}));
          }
        }else if(editPhysio.id){
          const {error:pe}=await client.from('physiotherapy_plans').update({is_active:false,updated_at:new Date().toISOString()}).eq('id',editPhysio.id);
          if(pe)throw pe;
        }
      }catch(orderError){const text=`Patient details saved, but medicines or care plan could not be updated: ${orderError.message}`;setEditMsg(text);showPatientToast('error',text);setEditBusy(false);return}
      const successText='Patient information, medicines, care plan and documents updated successfully.';
      setEditMsg(successText);showPatientToast('success',successText);await load();await loadEditMedia({...data,id:editTarget.id});
      if(selected?.id===editTarget.id){setSelected(data);setTimeout(()=>openPatient(data),0)}
      setEditUploads({photo:[],identity:[],prescription:[],discharge:[],reports:[],other:[]});setEditBusy(false);
    }

    async function printPatientIdCard(row){
      const url=await resolvePatientPhoto(row);const win=window.open('','_blank','width=760,height=820');if(!win){alert('Please allow pop-ups to print the Patient ID card.');return}
      const doctor=row.referring_doctor||row.treating_doctor||row.family_doctor||'—';
      const emergencyName=row.attendant_name||'—';const emergencyPhone=row.attendant_phone||row.mobile||'—';
      win.document.write(`<!doctype html><html><head><title>Patient ID Card</title><style>body{font-family:Arial;margin:0;padding:24px;background:#eef6f4}.card{width:390px;min-height:650px;margin:auto;background:white;border-radius:24px;overflow:hidden;box-shadow:0 12px 35px #0002;border:2px solid #086b58}.head{background:#086b58;color:white;text-align:center;padding:20px}.head h1{margin:0;font-size:24px}.head p{margin:6px 0 0}.photo{width:125px;height:145px;border:4px solid white;border-radius:16px;object-fit:cover;background:#ddd;margin:14px auto 10px;display:block;box-shadow:0 4px 15px #0003}.body{padding:10px 26px 24px;text-align:center}.name{font-size:25px;font-weight:bold;color:#063f36}.category{font-size:16px;color:#086b58;margin:4px 0 12px}.grid{text-align:left;line-height:1.55;font-size:15px}.row{padding:4px 0;border-bottom:1px solid #eef2f1}.label{font-weight:bold;color:#444}.emergency{margin-top:12px;padding:10px;background:#fff4e5;border:1px solid #f2c87d;border-radius:10px}.barcode{margin-top:14px;padding:9px;border-top:1px dashed #aaa;font-family:monospace}.print{display:block;margin:20px auto;padding:12px 24px}@media print{.print{display:none}body{background:white;padding:0}}</style></head><body><div class="card"><div class="head"><h1>SAMARA HEALTH CARE LLP</h1><p>Assisted Living Patient Identity & Emergency Card</p></div><div class="body">${url?`<img class="photo" src="${url}">`:`<div class="photo" style="display:flex;align-items:center;justify-content:center;font-size:48px">SC</div>`}<div class="name">${escapeHtml(formalName(row))}</div><div class="category">${escapeHtml(row.patient_category||'Patient')}</div><div class="grid"><div class="row"><span class="label">Patient ID:</span> ${escapeHtml(row.patient_id||'—')}</div><div class="row"><span class="label">Main Diagnosis:</span> ${escapeHtml(row.diagnosis||'—')}</div><div class="row"><span class="label">Referred / Treating Doctor:</span> ${escapeHtml(doctor)}</div><div class="row"><span class="label">Doctor Mobile:</span> ${escapeHtml(row.doctor_phone||'—')}</div><div class="row"><span class="label">Room / Bed:</span> ${escapeHtml(`${row.room_no||'—'} / ${row.bed_no||'—'}`)}</div><div class="row"><span class="label">Gender / Age:</span> ${escapeHtml(`${row.gender||'—'} / ${row.age||'—'}`)}</div><div class="row"><span class="label">Patient Mobile:</span> ${escapeHtml(row.mobile||'—')}</div><div class="row"><span class="label">Allergies:</span> ${escapeHtml(row.allergies||'None recorded')}</div><div class="emergency"><div><span class="label">Emergency Contact:</span> ${escapeHtml(emergencyName)}</div><div><span class="label">Emergency Mobile:</span> ${escapeHtml(emergencyPhone)}</div></div></div><div class="barcode">${escapeHtml(row.patient_id||row.id)}</div></div></div><button class="print" onclick="window.print()">Print Patient ID Card</button></body></html>`);win.document.close();
    }
    function duplicateCount(row){const name=String(row.full_name||'').trim().toLowerCase();const mobile=String(row.mobile||row.attendant_phone||'').replace(/\D/g,'');return rows.filter(x=>x.id!==row.id&&String(x.full_name||'').trim().toLowerCase()===name&&(!mobile||String(x.mobile||x.attendant_phone||'').replace(/\D/g,'')===mobile)).length}
    function billingSummary(list){return (list||[]).reduce((a,x)=>{const n=Number(x.amount||0);if(x.transaction_type==='Charge')a.charges+=n;else if(x.transaction_type==='Payment')a.payments+=n;else if(x.transaction_type==='Discount')a.discounts+=n;else if(x.transaction_type==='Refund')a.refunds+=n;return a},{charges:0,payments:0,discounts:0,refunds:0})}
    function tabButton(name,count){return h('button',{type:'button',className:`patient-tab ${tab===name?'active':''}`,onClick:()=>setTab(name)},name,count!=null?h('span',{className:'tab-count'},count):null)}
    function sectionEmpty(text){return h('p',{className:'small-note'},text)}
    const duplicateRows=rows.filter(r=>duplicateCount(r)>0);
    const activeRows=rows.filter(r=>r.is_active!==false);
    return h(React.Fragment,null,
      h('div',{className:'grid stats patient-master-stats'},
        h('div',{className:'card stat'},h('span',null,'Active patients'),h('strong',null,activeRows.length)),
        h('div',{className:'card stat'},h('span',null,'Room assigned'),h('strong',null,activeRows.filter(x=>x.room_no&&x.bed_no).length)),
        h('div',{className:'card stat'},h('span',null,'Awaiting room'),h('strong',null,activeRows.filter(x=>!x.room_no||!x.bed_no).length)),
        h('div',{className:'card stat'},h('span',null,'Possible duplicates'),h('strong',null,duplicateRows.length))
      ),
      h('div',{className:'card panel'},
        h('div',{className:'panel-head'},h('div',null,h('h3',null,'Patient Master'),h('small',null,'Single source for identity, admission, nursing, medicines, diet, documents, billing and recovery'))),
        duplicateRows.length?h('div',{className:'message warning'},`${duplicateRows.length} record(s) may be duplicates. Review matching names/mobile numbers before entering new care data.`):null,
        h('div',{className:'table-wrap'},
          h('table',{className:'table'},
            h('thead',null,h('tr',null,['Photo','Patient ID','Patient','Admission Type','Category','Room/Bed','Status','Action'].map(x=>h('th',{key:x},x)))),
            h('tbody',null,
              rows.map(r=>h('tr',{key:r.id,className:duplicateCount(r)?'duplicate-row':''},
                h('td',null,r.photo_storage_path?h('span',{className:'photo-dot'},'Photo'):'—'),
                h('td',null,r.patient_id||'—'),
                h('td',null,h('button',{type:'button',className:'patient-name-link',onClick:()=>openPatient(r)},formalName(r)),duplicateCount(r)?h('div',{className:'small-note danger-text'},'Possible duplicate'):null),
                h('td',null,r.admission_type||'—'),
                h('td',null,r.patient_category||'—'),
                h('td',null,r.room_no&&r.bed_no?`${r.room_no}-${r.bed_no}`:h('span',{className:'pill warning'},'Unassigned')),
                h('td',null,h('span',{className:`badge ${r.is_active===false?'off':''}`},r.is_active===false?'Inactive':'Active')),
                h('td',null,h('div',{className:'employee-actions'},
                  h('button',{className:'btn btn-secondary',onClick:()=>openPatient(r)},clinicalView?'View Patient File':'Open Patient File'),
                  canEdit?h('button',{className:'btn btn-secondary',onClick:()=>openEditPatient(r)},'Edit'):null,
                  canEdit?h('button',{className:'btn btn-secondary',onClick:()=>printPatientIdCard(r)},'Print ID Card'):null
                ))
              )),
              rows.length===0&&h('tr',null,h('td',{colSpan:8,className:'empty'},'No patients registered'))
            )
          )
        )
      ),
      selected&&details&&h('div',{className:'modal-backdrop'},h('div',{className:'card modal patient-master-modal'},
        h('div',{className:'panel-head patient-master-header'},h('div',{className:'patient-head'},photoUrl?h('img',{src:photoUrl,className:'patient-photo'}):h('div',{className:'patient-photo patient-photo-placeholder'},'SC'),h('div',null,h('h3',null,formalName(selected)),h('small',null,`${selected.patient_id||'—'} · ${selected.admission_type||''} · ${selected.patient_category||''}`),h('div',{className:'patient-header-badges'},h('span',{className:'badge'},selected.is_active===false?'Inactive':'Active'),selected.room_no&&selected.bed_no?h('span',{className:'pill'},`Room ${selected.room_no} · Bed ${selected.bed_no}`):h('span',{className:'pill warning'},'Room not assigned'),selected.special_nurse_required?h('span',{className:'pill warning'},`Special nurse: ${selected.special_nurse_name||'Required'}`):null))),h('div',{className:'employee-actions'},canEdit?h('button',{className:'btn btn-secondary',onClick:()=>openEditPatient(selected)},'Edit Patient'):h('span',{className:'pill'},'View only'),h('button',{className:'close',onClick:()=>{setSelected(null);setDetails(null);setPhotoUrl('')}},'×'))),
        h('div',{className:'patient-tab-bar'},tabButton('Overview'),tabButton('Documents',details.docs.length),tabButton('Medicines',details.meds.length),tabButton('Nursing',details.careLogs.length),tabButton('Vitals',details.vitals.length),tabButton('Physiotherapy',details.physioSessions.length),tabButton('Diet',details.meals.length),!clinicalView?tabButton('Billing',details.billing.length):null,tabButton('Timeline',details.recovery.length+details.incidents.length)),
        h('div',{className:'patient-tab-content'},
          tab==='Overview'&&h('div',{className:'tabs-grid'},
            h('div',{className:'section-card'},h('h4',null,'Identity & Contacts'),h('p',null,`Patient ID: ${selected.patient_id||'—'}`),h('p',null,`Gender / Age: ${selected.gender||'—'} / ${selected.age||'—'}`),h('p',null,`Mobile: ${selected.mobile||'—'}`),h('p',null,selected.address||'Address not recorded'),h('p',null,`Attendant: ${selected.attendant_name||'—'} · ${selected.attendant_phone||'—'}`)),
            h('div',{className:'section-card'},h('h4',null,'Admission & Medical Overview'),h('p',null,`Admission: ${selected.admission_type||'—'} · ${selected.admission_date||'—'}`),h('p',null,`Hospital / Source: ${selected.hospital_name||selected.referring_source||'—'}`),h('p',null,selected.diagnosis||'Diagnosis not recorded'),h('p',null,`Allergies: ${selected.allergies||'None recorded'}`),h('p',null,selected.special_instructions||'No special instructions')),
            h('div',{className:'section-card'},h('h4',null,'Care Plan Summary'),h('p',null,`${details.meds.length} active medicine order(s)`),h('p',null,`${details.care.length} master care task(s)`),h('p',null,`${details.physio.length} physiotherapy order(s)`),h('p',null,`Diet: ${selected.diet_plan||'Not recorded'}`)),
            h('div',{className:'section-card'},h('h4',null,'Risk & Safety'),h('p',null,[selected.fall_risk&&'Fall risk',selected.pressure_sore_risk&&'Pressure sore risk',selected.aspiration_risk&&'Aspiration risk',selected.wandering_risk&&'Wandering risk',selected.oxygen_required&&'Oxygen required',selected.dressing_required&&'Dressing required'].filter(Boolean).join(', ')||'No active risk flags'),h('p',null,`Open incidents: ${details.incidents.filter(x=>x.status==='Open').length}`))
          ),
          tab==='Documents'&&h('div',{className:'section-card'},h('div',{className:'panel-head'},h('h4',null,'Patient Documents'),canEdit?h('button',{className:'btn btn-secondary',onClick:()=>printPatientIdCard(selected)},'Print Patient ID Card'):null),details.docs.length?details.docs.map(d=>h('div',{className:'timeline-item',key:d.id},h('strong',null,d.document_type||'Document'),h('span',null,d.document_name||d.file_name||'File'),h('button',{className:'btn btn-secondary',onClick:()=>openDoc(d)},'Open'))):sectionEmpty('No documents uploaded.')),
          tab==='Medicines'&&h('div',{className:'section-card'},h('h4',null,'Prescription & Medication Administration'),details.meds.length?details.meds.map(m=>h('div',{className:'timeline-item',key:m.id},h('strong',null,`${m.medicine_name} ${m.strength||''} — ${m.dose}`),h('div',{className:'time-list'},(m.scheduled_times||[]).map(t=>h('span',{className:'time-chip',key:t},medicationTimeLabel(t)))),h('div',{className:'small-note'},`${m.route||''} · ${m.food_instruction||''} · ${m.special_instruction||''}`))):sectionEmpty('No medicine orders.'),h('h4',{style:{marginTop:'18px'}},'Recent MAR'),details.mar.length?details.mar.slice(0,25).map(x=>h('div',{className:'timeline-item',key:x.id},h('strong',null,`${x.scheduled_date} ${String(x.scheduled_time||'').slice(0,5)} · ${x.status}`),h('span',null,x.remarks||'—'))):sectionEmpty('No medicine administration records.')),
          tab==='Nursing'&&h('div',{className:'section-card'},h('h4',null,'Master Care Plan'),details.care.length?details.care.map(c=>h('div',{className:'timeline-item',key:c.id},h('strong',null,c.care_type),h('span',null,`${c.shift} · ${c.frequency} · ${c.instruction||''}`))):sectionEmpty('No care orders.'),h('h4',{style:{marginTop:'18px'}},'Recent Care Records'),details.careLogs.length?details.careLogs.slice(0,30).map(x=>h('div',{className:'timeline-item',key:x.id},h('strong',null,`${x.care_date} · ${x.shift} · ${x.status}`),h('span',null,x.remarks||'—'))):sectionEmpty('No care records.')),
          tab==='Vitals'&&h('div',{className:'section-card'},h('h4',null,'Vital Signs History'),details.vitals.length?details.vitals.map(v=>h('div',{className:'timeline-item',key:v.id},h('strong',null,`${fmt(v.recorded_at)} · BP ${v.systolic||'—'}/${v.diastolic||'—'}`),h('span',null,`Pulse ${v.pulse||'—'} · SpO₂ ${v.spo2||'—'} · Temp ${v.temperature||'—'} · Sugar ${v.blood_sugar_type||'Not Taken'} ${v.blood_sugar||'—'} · ${v.alert_level||'Normal'}`))):sectionEmpty('No vital signs recorded.')),
          tab==='Physiotherapy'&&h('div',{className:'section-card'},h('h4',null,'Physiotherapy Plan'),details.physio.length?details.physio.map(x=>h('div',{className:'timeline-item',key:x.id},h('strong',null,x.therapy_type),h('span',null,`${x.frequency||'—'} · ${x.preferred_time||'—'} · ${x.precautions||''}`))):sectionEmpty('No physiotherapy order.'),h('h4',{style:{marginTop:'18px'}},'Sessions'),details.physioSessions.length?details.physioSessions.map(x=>h('div',{className:'timeline-item',key:x.id},h('strong',null,`${x.session_date} · ${x.status}`),h('span',null,x.notes||'—'))):sectionEmpty('No physiotherapy sessions.')),
          tab==='Diet'&&h('div',{className:'section-card'},h('h4',null,`Diet Plan: ${selected.diet_plan||'Not recorded'}`),h('p',null,selected.feeding_instruction||'No special feeding instruction.'),h('h4',{style:{marginTop:'18px'}},'Meal Records'),details.meals.length?details.meals.map(x=>h('div',{className:'timeline-item',key:x.id},h('strong',null,`${x.meal_date||''} · ${x.meal_type} · ${x.consumption_status}`),h('span',null,`${x.menu||'—'} · ${x.remarks||''}`))):sectionEmpty('No meal records.')),
          !clinicalView&&tab==='Billing'&&(()=>{const b=billingSummary(details.billing),due=b.charges-b.payments-b.discounts+b.refunds;return h('div',null,h('div',{className:'grid stats'},[['Charges',b.charges],['Payments',b.payments],['Discounts',b.discounts],['Outstanding',due]].map(([k,v])=>h('div',{className:'card stat',key:k},h('span',null,k),h('strong',null,`₹${v.toLocaleString('en-IN')}`)))),h('div',{className:'section-card'},h('h4',null,'Patient Ledger'),details.billing.length?details.billing.map(x=>h('div',{className:'timeline-item',key:x.id},h('strong',null,`${x.transaction_type} · ${x.category} · ₹${Number(x.amount||0).toLocaleString('en-IN')}`),h('span',null,`${fmt(x.transaction_date)} · ${x.description||''}`))):sectionEmpty('No billing transactions.')))} )(),
          tab==='Timeline'&&h('div',{className:'section-card'},h('h4',null,'Recovery & Incident Timeline'),[...details.recovery.map(x=>({id:`r-${x.id}`,date:x.event_at,title:x.event_type,note:x.note,type:'Recovery'})),...details.incidents.map(x=>({id:`i-${x.id}`,date:x.incident_at,title:x.incident_type,note:`${x.severity||''} · ${x.description||''} · ${x.status||''}`,type:'Incident'}))].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(x=>h('div',{className:'timeline-item',key:x.id},h('strong',null,`${fmt(x.date)} · ${x.type}: ${x.title}`),h('span',null,x.note||'—'))),details.recovery.length+details.incidents.length===0&&sectionEmpty('No recovery or incident events.'))
        )
      )),
      canEdit&&editTarget&&editForm&&h('div',{className:'modal-backdrop'},h('form',{className:'card modal patient-edit-modal',onSubmit:savePatientEdit},
        h('div',{className:'panel-head'},h('div',null,h('h3',null,'Edit Patient Information'),h('small',null,`${editTarget.patient_id||'—'} · Correct duplicate or wrongly entered details`)),h('button',{type:'button',className:'close',onClick:()=>{setEditTarget(null);setEditForm(null)}},'×')),
        editMsg&&h('div',{className:`message ${editMsg.startsWith('Patient information')?'success':'error'}`},editMsg),
        h('div',{className:'modal-grid'},
          selectField('Title / Salutation','title',editForm,setEditForm,PATIENT_TITLES),field('Patient Name','full_name',editForm,setEditForm,true),field('Age','age',editForm,setEditForm,false,'number'),selectField('Gender','gender',editForm,setEditForm,['Male','Female','Other']),field('Patient Mobile','mobile',editForm,setEditForm,false,'tel'),
          field('Emergency Contact Name','attendant_name',editForm,setEditForm,false),field('Emergency Contact Number','attendant_phone',editForm,setEditForm,false,'tel'),
          field('Main Diagnosis','diagnosis',editForm,setEditForm,false),field('Referred By Doctor','referring_doctor',editForm,setEditForm,false),field('Treating Doctor','treating_doctor',editForm,setEditForm,false),field('Doctor Mobile','doctor_phone',editForm,setEditForm,false,'tel'),
          field('Hospital / Previous Centre','hospital_name',editForm,setEditForm,false),selectField('Admission Type','admission_type',editForm,setEditForm,['Hospital Discharge','Direct Admission','Doctor Referral','Hospital Transfer']),
          selectField('Patient Category','patient_category',editForm,setEditForm,['Short Stay','Respite Care','Post-Surgery','Rehabilitation','Stroke Recovery','Dementia Care','Parkinsonism','Palliative Care','Long-Term Assisted Living','Observation','Elderly Care']),
          roomBedSelect(roomBeds,editForm.room_no,editForm.bed_no,(room_no,bed_no)=>setEditForm({...editForm,room_no,bed_no}),false,editTarget.id),field('Admission Date','admission_date',editForm,setEditForm,false,'date'),
          field('Known Allergies','allergies',editForm,setEditForm,false),textareaField('Residential Address','address',editForm,setEditForm,'span-2'),textareaField('Special Instructions / Precautions','special_instructions',editForm,setEditForm,'span-2'),
          h('label',{className:'check-card span-2'},h('input',{type:'checkbox',checked:editForm.is_active!==false,onChange:e=>setEditForm({...editForm,is_active:e.target.checked})}),h('span',null,'Active Patient Record'))
        ),
        h('div',{className:'section-card'},h('div',{className:'section-title'},h('h4',null,'3. Current medicines and prescription verification'),h('button',{type:'button',className:'btn btn-secondary',onClick:()=>setEditMeds([...editMeds,blankMedicine()])},'Add medicine')),
          editMeds.length?editMeds.map((m,i)=>h('div',{className:'repeat-row medicine-order-row',key:m.id||i},miniInput('Medicine',m.medicine_name,v=>updateEditMed(i,'medicine_name',v),true),miniInput('Strength',m.strength,v=>updateEditMed(i,'strength',v),true),miniSelect('Frequency',m.frequency,['Once Daily (OD)','Twice Daily (BD)','Three Times Daily (TDS)','Four Times Daily (QID)','HS','STAT','SOS / PRN','Weekly','Monthly'],v=>setEditMeds(editMeds.map((row,n)=>n===i?{...row,frequency:v,times:(MEDICATION_FREQUENCY_TIMES[v]||String(row.times||'').split(',').map(normalizeMedicationTime).filter(Boolean)).join(', ')}:row))),miniSelect('Route',m.route,['Oral','IV','IM'],v=>updateEditMed(i,'route',v)),h(MedicationTimeSelector,{label:'Time',value:m.times,onChange:v=>updateEditMed(i,'times',v),required:true}),miniSelect('Food',m.food_instruction,['Before food','After food','With food','No restriction'],v=>updateEditMed(i,'food_instruction',v)),miniSelect('Duration',m.duration,['Single Dose','1 Day','3 Days','5 Days','7 Days','10 Days','14 Days','21 Days','30 Days','Until Doctor Review','Long Term','Custom'],v=>updateEditMed(i,'duration',v)),m.duration==='Custom'&&miniInput('Custom days',m.custom_duration_days,v=>updateEditMed(i,'custom_duration_days',v),true,'number'),miniInput('Start date',m.start_date,v=>updateEditMed(i,'start_date',v),true,'date'),miniInput('Special instruction',m.special_instruction,v=>updateEditMed(i,'special_instruction',v)),h('button',{type:'button',className:'icon-btn',onClick:()=>setEditMeds(editMeds.filter((_,n)=>n!==i))},'Remove'))):h('p',{className:'small-note'},'No current medicine recorded. Use Add medicine to create one.')),
        h('div',{className:'section-card'},h('h4',null,'4. Master care plan'),h('div',{className:'check-grid'},['Bathing assistance','Restroom/toileting assistance','Oral hygiene','Dressing assistance','Feeding assistance','Walking/mobility assistance','Diaper change','Position change / bedsore prevention','Fluid intake monitoring','Sleep assistance'].map(name=>h('label',{className:'check-card',key:name},h('input',{type:'checkbox',checked:editCare.some(x=>x.care_type===name),onChange:e=>e.target.checked?setEditCare([...editCare,{...blankCare(),care_type:name}]):setEditCare(editCare.filter(x=>x.care_type!==name))}),h('span',null,name)))),editCare.map((c,i)=>h('div',{className:'repeat-row care',key:c.id||c.care_type+i},miniInput('Care task',c.care_type,v=>updateEditCare(i,'care_type',v),true),miniSelect('Shift',c.shift,['Day Shift (7 AM–7 PM)','Night Shift (7 PM–7 AM)','Both shifts'],v=>updateEditCare(i,'shift',v)),miniSelect('Frequency',c.frequency,['Daily','Each shift','Twice daily','As required'],v=>updateEditCare(i,'frequency',v)),miniInput('Instruction',c.instruction,v=>updateEditCare(i,'instruction',v)),h('button',{type:'button',className:'icon-btn',onClick:()=>setEditCare(editCare.filter((_,n)=>n!==i))},'Remove'))),h('div',{className:'form-grid'},selectField('Diet plan','diet_plan',editForm,setEditForm,['Normal diet','Soft diet','Liquid diet','Diabetic diet','Low-salt diet','Renal diet','High-protein diet','Tube feeding','Custom diet']),textareaField('Feeding instructions','feeding_instruction',editForm,setEditForm,'span-2'))),
        h('div',{className:'section-card'},h('h4',null,'5. Risks and special nurse'),h('div',{className:'check-grid'},[['fall_risk','Fall risk'],['pressure_sore_risk','Pressure sore risk'],['aspiration_risk','Aspiration risk'],['wandering_risk','Wandering / confusion risk'],['infection_risk','Infection-control precautions'],['seizure_history','Seizure history']].map(([key,label])=>h('label',{className:'check-card',key},h('input',{type:'checkbox',checked:!!editForm[key],onChange:e=>setEditForm({...editForm,[key]:e.target.checked})}),h('span',null,label)))),h('label',{className:'check-card'},h('input',{type:'checkbox',checked:!!editForm.special_nurse_required,onChange:e=>setEditForm({...editForm,special_nurse_required:e.target.checked})}),h('span',null,'Special nurse required')),editForm.special_nurse_required&&h('div',{className:'form-grid'},field('Special nurse name','special_nurse_name',editForm,setEditForm,false),selectField('Special nurse shift','special_nurse_shift',editForm,setEditForm,['Day Shift (7 AM–7 PM)','Night Shift (7 PM–7 AM)','Both shifts']))),

        h('div',{className:'section-card'},
          h('div',{className:'panel-head'},
            h('div',null,h('h4',null,'6. Physiotherapy Plan'),h('small',null,'Add or update therapy advised for this patient')),
            h('label',{className:'check-card'},h('input',{type:'checkbox',checked:!!editPhysio.required,onChange:e=>setEditPhysio({...editPhysio,required:e.target.checked,is_active:e.target.checked})}),h('span',null,'Physiotherapy required'))
          ),
          editPhysio.required
            ?h('div',{className:'form-grid'},
              h('div',{className:'field'},h('label',null,'Therapy / Exercise'),h('input',{required:true,value:editPhysio.therapy_type,onChange:e=>setEditPhysio({...editPhysio,therapy_type:e.target.value}),placeholder:'Example: Gait training / ROM exercises'})),
              h('div',{className:'field'},h('label',null,'Physiotherapist Name'),h('input',{value:editPhysio.physiotherapist_name,onChange:e=>setEditPhysio({...editPhysio,physiotherapist_name:e.target.value}),placeholder:'Name of physiotherapist'})),
              h('div',{className:'field'},h('label',null,'Frequency'),h('select',{value:editPhysio.frequency,onChange:e=>setEditPhysio({...editPhysio,frequency:e.target.value})},['Once daily','Twice daily','Three times daily','Alternate days','Weekly','As advised'].map(x=>h('option',{key:x,value:x},x)))),
              h('div',{className:'field'},h('label',null,'Preferred Time'),h('input',{type:'time',value:editPhysio.preferred_time,onChange:e=>setEditPhysio({...editPhysio,preferred_time:e.target.value})})),
              h('div',{className:'field'},h('label',null,'Advised By'),h('input',{value:editPhysio.advised_by,onChange:e=>setEditPhysio({...editPhysio,advised_by:e.target.value}),placeholder:'Doctor / Physiotherapist'})),
              h('div',{className:'field'},h('label',null,'Start Date'),h('input',{type:'date',max:todayISOIndia(),value:editPhysio.start_date,onChange:e=>setEditPhysio({...editPhysio,start_date:e.target.value})})),
              h('div',{className:'field'},h('label',null,'End Date (optional)'),h('input',{type:'date',min:editPhysio.start_date||undefined,value:editPhysio.end_date,onChange:e=>setEditPhysio({...editPhysio,end_date:e.target.value})})),
              h('div',{className:'field span-2'},h('label',null,'Precautions / Restrictions'),h('textarea',{rows:3,value:editPhysio.precautions,onChange:e=>setEditPhysio({...editPhysio,precautions:e.target.value}),placeholder:'Weight-bearing restriction, fall precaution, pain limit, oxygen support, etc.'}))
            )
            :h('p',{className:'small-note'},editPhysio.id?'This plan will be marked inactive when the Patient File is saved.':'Enable “Physiotherapy required” to enter the treatment plan.')
        ),
        h('div',{className:'section-card patient-edit-media'},
          h('div',{className:'panel-head'},h('div',null,h('h4',null,'Patient Photo and Medical Documents'),h('small',null,'Upload a file, use the mobile camera, or capture through the webcam.'))),
          h('div',{className:'patient-edit-photo-row'},editPhotoUrl?h('img',{src:editPhotoUrl,className:'patient-photo',alt:'Patient photo'}):h('div',{className:'patient-photo patient-photo-placeholder'},'SC'),editCaptureField('Patient Photo','photo','image/*',true)),
          h('div',{className:'upload-grid'},editCaptureField('Identity Proof','identity'),editCaptureField('Current Prescription','prescription'),editCaptureField('Discharge / Transfer Summary','discharge'),editCaptureField('Lab / Scan / Test Reports','reports'),editCaptureField('Other Medical Documents','other')),
          h('h4',{style:{marginTop:'18px'}},'Uploaded Documents'),
          editDocs.length?h('div',{className:'uploaded-documents-list'},editDocs.map(doc=>h('div',{className:'timeline-item',key:doc.id},h('div',null,h('strong',null,doc.document_type||'Document'),h('span',null,doc.document_name||'File')),h('div',{className:'employee-actions'},h('button',{type:'button',className:'btn btn-secondary',onClick:()=>openDoc(doc)},'Open'),h('button',{type:'button',className:'btn btn-danger',onClick:()=>deleteEditDocument(doc)},'Delete'))))):h('p',{className:'small-note'},'No documents uploaded yet.')
        ),
        h('button',{className:'btn btn-primary full',disabled:editBusy},editBusy?'Saving changes…':'Save Patient Information & Documents')
      )),
      editCameraConfig?h(CameraCaptureModal,{config:editCameraConfig,onClose:()=>setEditCameraConfig(null)}):null,
      patientToast&&h('div',{className:`samara-toast ${patientToast.type}`,role:'status','aria-live':'polite'},
        h('span',{className:'samara-toast-icon','aria-hidden':'true'},patientToast.type==='success'?'✓':'!'),
        h('div',null,h('strong',null,patientToast.type==='success'?'Update successful':'Update failed'),h('span',null,patientToast.text)),
        h('button',{type:'button','aria-label':'Close notification',onClick:()=>setPatientToast(null)},'×')
      )
    );
  }

  function usePatients(){
    const [rows,setRows]=React.useState([]);
    const load=React.useCallback(async()=>{const {data,error}=await client.from('patients').select('*').eq('is_active',true).order('full_name');if(error)console.error(error);setRows(data||[])},[]);
    React.useEffect(()=>{load();const ch=client.channel(`active-patients-${Math.random()}`).on('postgres_changes',{event:'*',schema:'public',table:'patients'},load).subscribe();return()=>client.removeChannel(ch)},[load]);
    return [rows,load];
  }
  function patientSelect(rows,value,onChange,label='Patient'){return h('div',{className:'field'},h('label',null,label),h('select',{value,onChange:e=>onChange(e.target.value),required:true},h('option',{value:''},'Select patient'),rows.map(p=>h('option',{key:p.id,value:p.id},`${p.patient_id||'NO-ID'} · ${formalName(p)} · ${p.room_no&&p.bed_no?`Room ${p.room_no}-${p.bed_no}`:'Room unassigned'}`))))}
  function roomBedSelect(rows,roomNo,bedNo,onChange,required=false,currentPatientId=''){
    const value=roomNo&&bedNo?`${roomNo}|||${bedNo}`:'';
    const sorted=[...(rows||[])].sort((a,b)=>String(a.room_no).localeCompare(String(b.room_no),undefined,{numeric:true})||String(a.bed_no).localeCompare(String(b.bed_no)));
    return h('div',{className:'field span-2'},h('label',null,'Room / Bed'),h('select',{className:'room-bed-select',value,required,onChange:e=>{const [r,b]=String(e.target.value||'').split('|||');onChange(r||'',b||'')}},
      h('option',{value:''},'Select Room / Bed'),
      sorted.map(r=>{const occupied=!!r.patient_id&&r.patient_id!==currentPatientId;const status=occupied?'Occupied':(r.status||'Available');const disabled=occupied||status==='Maintenance';const bg=status==='Available'?'#dff7e8':status==='Occupied'?'#ffe1e1':status==='Reserved'?'#e3eeff':'#f1f1f1';const color=status==='Available'?'#087a3d':status==='Occupied'?'#b42318':status==='Reserved'?'#175cd3':'#555';return h('option',{key:r.id,value:`${r.room_no}|||${r.bed_no}`,disabled,style:{backgroundColor:bg,color,fontWeight:'700'}},`${r.room_no}-${r.bed_no} · ${status} · ${r.room_type||'Room'}`)})))
  }

  function fileInput(label,files,setFiles,accept='image/*,.pdf',camera=false){return h('div',{className:'field'},h('label',null,label),h('input',{type:'file',accept,multiple:true,capture:camera?'environment':undefined,onChange:e=>setFiles(Array.from(e.target.files||[]))}),files?.length?h('small',null,`${files.length} file(s) selected`):null)}

  function Section({title,subtitle,actions,children}){return h('div',{className:'card panel'},h('div',{className:'panel-head'},h('div',null,h('h3',null,title),subtitle&&h('small',null,subtitle)),actions),children)}

  
  function DischargeManagement({profile}){
    const canInitiate=['Admin','Manager','Nurse'].includes(profile?.role);
    const canComplete=['Admin','Manager'].includes(profile?.role);
    const canClearBilling=['Admin','Manager','Accounts'].includes(profile?.role);
    const [rows,setRows]=React.useState([]);
    const [patients,setPatients]=React.useState([]);
    const [loading,setLoading]=React.useState(true);
    const [message,setMessage]=React.useState('');
    const [show,setShow]=React.useState(false);
    const [editing,setEditing]=React.useState(null);
    const [busy,setBusy]=React.useState(false);
    const [toast,setToast]=React.useState(null);
    const toastTimer=React.useRef(null);
    const initial={
      patient_id:'',
      discharge_type:'Planned Discharge',
      proposed_discharge_date:todayISOIndia(),
      proposed_discharge_time:'10:00',
      destination:'Home',
      destination_details:'',
      doctor_name:'',
      doctor_contact:'',
      doctor_discharge_advice:'',
      condition_at_discharge:'Stable',
      relative_name:'',
      relative_contact:'',
      transport_arrangement:'Family Transport',
      medicines_handed_over:false,
      discharge_summary_handed_over:false,
      reports_handed_over:false,
      valuables_handed_over:false,
      billing_clearance_status:'Pending',
      clinical_clearance_status:'Pending',
      room_clearance_status:'Pending',
      final_instructions:'',
      remarks:'',
      status:'Initiated'
    };
    const [form,setForm]=React.useState(initial);

    function showToast(type,text){
      clearTimeout(toastTimer.current);
      setToast({type,text});
      toastTimer.current=setTimeout(()=>setToast(null),5000);
    }
    React.useEffect(()=>()=>clearTimeout(toastTimer.current),[]);

    async function load(){
      setLoading(true);setMessage('');
      const [d,p]=await Promise.all([
        client.from('patient_discharges').select('*').order('created_at',{ascending:false}),
        client.from('patients').select('id,title,full_name,patient_id,room_no,bed_no,is_active,attendant_name,attendant_phone,treating_doctor,doctor_phone').order('full_name')
      ]);
      if(d.error){setMessage(d.error.message||'Unable to load discharge records.');setRows([])}else setRows(d.data||[]);
      if(!p.error)setPatients(p.data||[]);
      setLoading(false);
    }
    React.useEffect(()=>{
      load();
      const ch=client.channel('discharge-live')
        .on('postgres_changes',{event:'*',schema:'public',table:'patient_discharges'},load)
        .on('postgres_changes',{event:'*',schema:'public',table:'patients'},load)
        .subscribe();
      return()=>client.removeChannel(ch);
    },[]);

    const patientFor=id=>patients.find(p=>p.id===id)||{};
    const patientLabel=id=>{
      const p=patientFor(id);
      return p.id?`${formalName(p)} · ${p.patient_id||'—'} · Room ${p.room_no||'—'}${p.bed_no?`-${p.bed_no}`:''}`:'Patient not linked';
    };
    const clockLabel=value=>{
      if(!value)return '—';
      const [h,m]=String(value).slice(0,5).split(':').map(Number);
      return `${h%12||12}:${String(m||0).padStart(2,'0')} ${h<12?'AM':'PM'}`;
    };

    function openNew(){
      setEditing(null);setForm({...initial,proposed_discharge_date:todayISOIndia()});setShow(true);
    }
    function openEdit(row){
      setEditing(row);setForm({...initial,...row,proposed_discharge_time:String(row.proposed_discharge_time||'10:00').slice(0,5)});setShow(true);
    }
    function onPatient(id){
      const p=patientFor(id);
      setForm(current=>({...current,patient_id:id,relative_name:p.attendant_name||'',relative_contact:p.attendant_phone||'',doctor_name:p.treating_doctor||'',doctor_contact:p.doctor_phone||''}));
    }

    async function save(e){
      e.preventDefault();
      if(!canInitiate&&!editing)return;
      if(!form.patient_id){showToast('error','Please select the patient.');return}
      if(isFutureDateIndia(form.proposed_discharge_date)){showToast('error','Future discharge dates are not permitted at the time of final discharge.');return}
      if(!form.doctor_name.trim()||!form.doctor_discharge_advice.trim()){showToast('error','Doctor name and discharge advice are mandatory.');return}
      setBusy(true);
      const {data:{user}}=await client.auth.getUser();
      const payload={...form,initiated_by:editing?.initiated_by||user?.id||profile?.id,updated_at:new Date().toISOString()};
      delete payload.id;delete payload.created_at;delete payload.completed_at;delete payload.completed_by;
      let result=editing
        ?await client.from('patient_discharges').update(payload).eq('id',editing.id).select('id').single()
        :await client.from('patient_discharges').insert(payload).select('id').single();
      setBusy(false);
      if(result.error){showToast('error',result.error.message||'Unable to save discharge request.');return}
      showToast('success',editing?'Discharge formalities updated successfully.':'Discharge process initiated successfully.');
      setShow(false);await load();
      writeAuditEvent(editing?'Discharge Updated':'Discharge Initiated','Discharge',result.data?.id,{
        patient_id:form.patient_id,status:form.status,discharge_type:form.discharge_type
      },'Success');
    }

    async function setBilling(row,status){
      if(!canClearBilling)return;
      const {error}=await client.from('patient_discharges').update({billing_clearance_status:status,updated_at:new Date().toISOString()}).eq('id',row.id);
      if(error){showToast('error',error.message);return}
      showToast('success',`Billing clearance marked ${status}.`);await load();
    }

    async function complete(row){
      if(!canComplete)return;
      const missing=[];
      if(row.billing_clearance_status!=='Cleared')missing.push('Billing clearance');
      if(row.clinical_clearance_status!=='Cleared')missing.push('Clinical clearance');
      if(row.room_clearance_status!=='Cleared')missing.push('Room/property clearance');
      if(!row.medicines_handed_over)missing.push('Medicines handover');
      if(!row.discharge_summary_handed_over)missing.push('Discharge summary');
      if(missing.length){showToast('error',`Complete the following before discharge: ${missing.join(', ')}.`);return}
      if(!confirm(`Complete discharge for ${patientLabel(row.patient_id)}? The room and bed will become Available automatically.`))return;
      setBusy(true);
      const {data,error}=await client.rpc('complete_patient_discharge',{p_discharge_id:row.id});
      setBusy(false);
      if(error){showToast('error',error.message||'Unable to complete discharge.');return}
      showToast('success','Patient discharged successfully. The room and bed are now Available.');
      await load();
      writeAuditEvent('Patient Discharged','Discharge',row.id,{patient_id:row.patient_id,bed_released:true},'Success');
    }

    const tableRows=rows.map(row=>[
      patientLabel(row.patient_id),
      row.discharge_type||'—',
      `${formatDateIN(row.proposed_discharge_date)} ${clockLabel(row.proposed_discharge_time)}`,
      row.destination||'—',
      row.doctor_name||'—',
      h('span',{className:`badge ${row.billing_clearance_status==='Cleared'?'':'off'}`},`Billing: ${row.billing_clearance_status||'Pending'}`),
      h('span',{className:`badge ${row.clinical_clearance_status==='Cleared'?'':'off'}`},`Clinical: ${row.clinical_clearance_status||'Pending'}`),
      h('span',{className:`badge ${row.status==='Completed'?'':'off'}`},row.status||'Initiated'),
      h('div',{className:'employee-actions'},
        ['Admin','Manager','Nurse'].includes(profile.role)&&row.status!=='Completed'&&h('button',{className:'btn btn-secondary',onClick:()=>openEdit(row)},'Update'),
        canClearBilling&&row.status!=='Completed'&&h('button',{className:'btn btn-secondary',onClick:()=>setBilling(row,row.billing_clearance_status==='Cleared'?'Pending':'Cleared')},row.billing_clearance_status==='Cleared'?'Reopen Billing':'Clear Billing'),
        canComplete&&row.status!=='Completed'&&h('button',{className:'btn btn-primary',onClick:()=>complete(row),disabled:busy},'Complete Discharge')
      )
    ]);

    return h(React.Fragment,null,
      h(Section,{title:'Patient Discharge',subtitle:'Controlled discharge formalities with automatic room and bed release'},
        message&&h('div',{className:'message error'},message),
        h('div',{className:'panel-head'},
          h('p',{className:'small-note'},'Nurse initiates the clinical discharge process. Accounts clears billing. Admin or Manager verifies all formalities and completes discharge.'),
          canInitiate&&h('button',{className:'btn btn-primary',onClick:openNew},'Initiate Discharge')
        )
      ),
      h(LogTable,{
        title:`Discharge Register (${tableRows.length})`,
        subtitle:'The bed is released only after Admin/Manager completes discharge',
        heads:['Patient','Type','Planned Date / Time','Destination','Doctor','Billing','Clinical','Status','Action'],
        rows:tableRows
      }),
      !loading&&!message&&!tableRows.length&&h('div',{className:'card panel'},h('p',{className:'small-note'},'No discharge process has been initiated.')),
      show&&h('div',{className:'modal-backdrop',onClick:e=>{if(e.target===e.currentTarget)setShow(false)}},
        h('form',{className:'card modal',style:{width:'min(1100px,96vw)',maxHeight:'92vh',overflow:'auto'},onSubmit:save},
          h('div',{className:'panel-head'},
            h('div',null,h('h3',null,editing?'Update Discharge Formalities':'Initiate Patient Discharge'),h('small',null,'Clinical, billing, documents, belongings and room-clearance checklist')),
            h('button',{type:'button',className:'close',onClick:()=>setShow(false)},'×')
          ),
          h('div',{className:'modal-grid'},
            h('div',{className:'field'},h('label',null,'Patient'),h('select',{required:true,value:form.patient_id,disabled:!!editing,onChange:e=>onPatient(e.target.value)},h('option',{value:''},'Select active patient'),patients.filter(p=>p.is_active!==false).map(p=>h('option',{key:p.id,value:p.id},patientLabel(p.id))))),
            h('div',{className:'field'},h('label',null,'Discharge Type'),h('select',{value:form.discharge_type,onChange:e=>setForm({...form,discharge_type:e.target.value})},['Planned Discharge','Transfer to Hospital','Discharge Against Medical Advice','Home Care Transfer','Death / Expiry','Other'].map(x=>h('option',{key:x,value:x},x)))),
            h('div',{className:'field'},h('label',null,'Discharge Date'),h('input',{type:'date',max:todayISOIndia(),value:form.proposed_discharge_date,onChange:e=>setForm({...form,proposed_discharge_date:e.target.value})})),
            h('div',{className:'field'},h('label',null,'Discharge Time'),h('input',{type:'time',value:form.proposed_discharge_time,onChange:e=>setForm({...form,proposed_discharge_time:e.target.value})})),
            h('div',{className:'field'},h('label',null,'Destination'),h('select',{value:form.destination,onChange:e=>setForm({...form,destination:e.target.value})},['Home','Hospital','Rehabilitation Centre','Another Assisted Living Facility','Relative Residence','Other'].map(x=>h('option',{key:x,value:x},x)))),
            h('div',{className:'field'},h('label',null,'Destination Details'),h('input',{value:form.destination_details,onChange:e=>setForm({...form,destination_details:e.target.value}),placeholder:'Hospital/facility/address'})),
            h('div',{className:'field'},h('label',null,'Doctor Name'),h('input',{required:true,value:form.doctor_name,onChange:e=>setForm({...form,doctor_name:e.target.value})})),
            h('div',{className:'field'},h('label',null,'Doctor Contact'),h('input',{value:form.doctor_contact,onChange:e=>setForm({...form,doctor_contact:e.target.value})})),
            h('div',{className:'field span-2'},h('label',null,'Doctor Discharge Advice'),h('textarea',{required:true,rows:3,value:form.doctor_discharge_advice,onChange:e=>setForm({...form,doctor_discharge_advice:e.target.value})})),
            h('div',{className:'field'},h('label',null,'Condition at Discharge'),h('select',{value:form.condition_at_discharge,onChange:e=>setForm({...form,condition_at_discharge:e.target.value})},['Stable','Improved','Requires Continued Monitoring','Transferred for Higher Care','Critical','Other'].map(x=>h('option',{key:x,value:x},x)))),
            h('div',{className:'field'},h('label',null,'Transport Arrangement'),h('select',{value:form.transport_arrangement,onChange:e=>setForm({...form,transport_arrangement:e.target.value})},['Family Transport','Ambulance','Facility Vehicle','Taxi','Other'].map(x=>h('option',{key:x,value:x},x)))),
            h('div',{className:'field'},h('label',null,'Receiving Relative / Attendant'),h('input',{value:form.relative_name,onChange:e=>setForm({...form,relative_name:e.target.value})})),
            h('div',{className:'field'},h('label',null,'Relative Contact'),h('input',{value:form.relative_contact,onChange:e=>setForm({...form,relative_contact:e.target.value})})),
            h('div',{className:'field span-2'},h('label',null,'Handover Checklist'),h('div',{className:'check-grid'},
              [['medicines_handed_over','Medicines handed over'],['discharge_summary_handed_over','Discharge summary handed over'],['reports_handed_over','Reports/documents handed over'],['valuables_handed_over','Personal belongings/valuables handed over']].map(([key,label])=>h('label',{className:'check-card',key},h('input',{type:'checkbox',checked:!!form[key],onChange:e=>setForm({...form,[key]:e.target.checked})}),h('span',null,label)))
            )),
            h('div',{className:'field'},h('label',null,'Clinical Clearance'),h('select',{value:form.clinical_clearance_status,onChange:e=>setForm({...form,clinical_clearance_status:e.target.value})},['Pending','Cleared'].map(x=>h('option',{key:x,value:x},x)))),
            h('div',{className:'field'},h('label',null,'Room / Property Clearance'),h('select',{value:form.room_clearance_status,onChange:e=>setForm({...form,room_clearance_status:e.target.value})},['Pending','Cleared'].map(x=>h('option',{key:x,value:x},x)))),
            h('div',{className:'field'},h('label',null,'Billing Clearance'),h('select',{disabled:!canClearBilling,value:form.billing_clearance_status,onChange:e=>setForm({...form,billing_clearance_status:e.target.value})},['Pending','Cleared'].map(x=>h('option',{key:x,value:x},x)))),
            h('div',{className:'field span-2'},h('label',null,'Final Instructions'),h('textarea',{rows:3,value:form.final_instructions,onChange:e=>setForm({...form,final_instructions:e.target.value})})),
            h('div',{className:'field span-2'},h('label',null,'Remarks'),h('textarea',{rows:2,value:form.remarks,onChange:e=>setForm({...form,remarks:e.target.value})}))
          ),
          h('div',{className:'actions'},h('button',{type:'button',className:'btn btn-secondary',onClick:()=>setShow(false)},'Cancel'),h('button',{className:'btn btn-primary',disabled:busy},busy?'Saving…':editing?'Update Formalities':'Initiate Discharge'))
        )
      ),
      toast&&h('div',{className:`samara-toast ${toast.type}`,role:'status','aria-live':'polite'},
        h('span',{className:'samara-toast-icon'},toast.type==='success'?'✓':'!'),
        h('div',null,h('strong',null,toast.type==='success'?'Discharge updated':'Discharge failed'),h('span',null,toast.text)),
        h('button',{type:'button',onClick:()=>setToast(null)},'×')
      )
    );
  }

function RoomsBeds({profile}){
    const canEdit=['Admin','Manager'].includes(profile?.role);
    const empty={room_no:'100',bed_no:'A',room_type:'Twin Sharing',daily_rate:'',status:'Available',patient_id:'',floor:'',wing:'',notes:''};
    const [rows,setRows]=React.useState([]),[patients,setPatients]=React.useState([]),[loading,setLoading]=React.useState(true);
    const [show,setShow]=React.useState(false),[form,setForm]=React.useState(empty),[editing,setEditing]=React.useState(null),[busy,setBusy]=React.useState(false),[msg,setMsg]=React.useState('');

    async function load(){
      setLoading(true);setMsg('');
      const [roomResult,patientResult]=await Promise.all([
        client.from('room_beds').select('*').order('room_no',{ascending:true}).order('bed_no',{ascending:true}),
        client.from('patients').select('id,patient_id,full_name,gender,room_no,bed_no,patient_category,special_nurse_required,is_active').eq('is_active',true).order('full_name')
      ]);
      if(roomResult.error){setMsg(roomResult.error.message||'Unable to load room and bed master');setRows([])}else setRows(roomResult.data||[]);
      if(patientResult.error){setMsg(patientResult.error.message||'Unable to load active patients');setPatients([])}else setPatients(patientResult.data||[]);
      setLoading(false);
    }
    React.useEffect(()=>{
      load();
      const ch=client.channel('room-beds-live-v81')
        .on('postgres_changes',{event:'*',schema:'public',table:'room_beds'},load)
        .on('postgres_changes',{event:'*',schema:'public',table:'patients'},load)
        .subscribe();
      return()=>client.removeChannel(ch);
    },[]);

    function patientFor(row){
      return patients.find(p=>p.id===row.patient_id)||patients.find(p=>String(p.room_no||'')===String(row.room_no||'')&&String(p.bed_no||'').toUpperCase()===String(row.bed_no||'').toUpperCase())||null;
    }
    const occupied=rows.filter(r=>patientFor(r)||r.status==='Occupied').length;
    const available=rows.filter(r=>!patientFor(r)&&r.status==='Available').length;
    const reserved=rows.filter(r=>r.status==='Reserved').length;
    const maintenance=rows.filter(r=>r.status==='Maintenance').length;
    const unassigned=patients.filter(p=>!p.room_no||!p.bed_no);

    function openNew(patientId=''){
      setEditing(null);setForm({...empty,patient_id:patientId});setMsg('');setShow(true);
    }
    function openEdit(row){
      const p=patientFor(row);
      setEditing(row);setForm({
        room_no:row.room_no||'',bed_no:row.bed_no||'',room_type:row.room_type||'Twin Sharing',daily_rate:row.daily_rate??'',status:row.status||'Available',patient_id:p?.id||row.patient_id||'',floor:row.floor||'',wing:row.wing||'',notes:row.notes||''
      });setMsg('');setShow(true);
    }
    async function save(e){
      e.preventDefault();setBusy(true);setMsg('');
      try{
        const roomNo=String(form.room_no||'').trim(),bedNo=String(form.bed_no||'').trim().toUpperCase();
        if(!roomNo||!bedNo)throw new Error('Room number and bed code are required.');
        let duplicateQuery=client.from('room_beds').select('id').eq('room_no',roomNo).eq('bed_no',bedNo);
        if(editing?.id)duplicateQuery=duplicateQuery.neq('id',editing.id);
        const {data:duplicates,error:dupError}=await duplicateQuery.limit(1);if(dupError)throw dupError;
        if(duplicates?.length)throw new Error(`Room ${roomNo} / Bed ${bedNo} already exists.`);

        const oldPatient=editing?patientFor(editing):null;
        if(oldPatient&&oldPatient.id!==form.patient_id){
          const {error}=await client.from('patients').update({room_no:null,bed_no:null}).eq('id',oldPatient.id);if(error)throw error;
        }
        if(form.patient_id){
          const selected=patients.find(p=>p.id===form.patient_id);
          if(!selected)throw new Error('Selected patient is no longer active.');
          const {error:clearOther}=await client.from('room_beds').update({patient_id:null,status:'Available'}).eq('patient_id',selected.id);
          if(clearOther)throw clearOther;
          const {error:clearBed}=await client.from('patients').update({room_no:null,bed_no:null}).eq('room_no',roomNo).eq('bed_no',bedNo).neq('id',selected.id);
          if(clearBed)throw clearBed;
          const {error:assignPatient}=await client.from('patients').update({room_no:roomNo,bed_no:bedNo}).eq('id',selected.id);
          if(assignPatient)throw assignPatient;
        }
        const payload={room_no:roomNo,bed_no:bedNo,room_type:form.room_type,daily_rate:Number(form.daily_rate||0),status:form.patient_id?'Occupied':form.status,patient_id:form.patient_id||null,floor:form.floor||null,wing:form.wing||null,notes:form.notes||null,updated_at:new Date().toISOString()};
        let result;
        if(editing?.id)result=await client.from('room_beds').update(payload).eq('id',editing.id);
        else result=await client.from('room_beds').insert(payload);
        if(result.error)throw result.error;
        setShow(false);setEditing(null);setForm(empty);await load();
      }catch(error){setMsg(error.message||'Unable to save room / bed')}
      setBusy(false);
    }
    async function removeRoom(row){
      if(!canEdit)return;
      const p=patientFor(row);
      if(p){alert('This bed is occupied. Transfer or unassign the patient before deleting it.');return}
      if(!confirm(`Delete Room ${row.room_no} / Bed ${row.bed_no}?`))return;
      const {error}=await client.from('room_beds').delete().eq('id',row.id);if(error)alert(error.message);else load();
    }

    if(loading)return h('div',{className:'loading'},'Loading room and bed master…');
    return h(React.Fragment,null,
      h('div',{className:'rooms-hero'},
        h('div',null,h('small',null,'LIVE OCCUPANCY CONTROL'),h('h3',null,'Rooms & Beds'),h('p',null,'One controlled Room & Bed Master. Room allocation elsewhere uses dropdown lists only.')),
        canEdit?h('button',{className:'btn btn-primary',onClick:()=>openNew()},'+ Add Room / Bed'):null
      ),
      h('div',{className:'grid stats room-summary'},
        h('div',{className:'card stat'},h('span',null,'Total beds'),h('strong',null,rows.length),h('small',null,'Configured capacity')),
        h('div',{className:'card stat room-stat-occupied'},h('span',null,'Occupied'),h('strong',null,occupied),h('small',null,`${available} available`)),
        h('div',{className:'card stat'},h('span',null,'Reserved'),h('strong',null,reserved),h('small',null,'Held for admission')),
        h('div',{className:'card stat'},h('span',null,'Maintenance'),h('strong',null,maintenance),h('small',null,'Temporarily unavailable'))
      ),
      h('div',{className:'card panel rooms-master-panel'},
        h('div',{className:'panel-head'},h('div',null,h('h3',null,'Room & Bed Master'),h('small',null,'Admin/Manager controlled master — no free room entry elsewhere')),canEdit?h('button',{className:'btn btn-primary',onClick:()=>openNew()},'+ Add Room / Bed'):null),
        msg&&!show?h('div',{className:'message error'},msg):null,
        h('div',{className:'table-wrap'},
          h('table',{className:'table rooms-table'},
            h('thead',null,
              h('tr',null,['Room','Bed','Type','Floor / Wing','Daily Rate','Status','Patient','Action'].map(x=>h('th',{key:x},x)))
            ),
            h('tbody',null,
              rows.map(row=>{
                const p=patientFor(row),status=p?'Occupied':row.status;
                return h('tr',{key:row.id,className:`room-row room-row-${String(status).toLowerCase()} ${p&&String(p.gender||'').toLowerCase()==='female'?'room-row-female':''}`},
                  h('td',null,h('strong',null,row.room_no)),
                  h('td',null,row.bed_no),
                  h('td',null,row.room_type||'—'),
                  h('td',null,[row.floor,row.wing].filter(Boolean).join(' / ')||'—'),
                  h('td',null,`₹${Number(row.daily_rate||0).toLocaleString('en-IN')}`),
                  h('td',null,h('span',{className:`room-status room-status-${String(status).toLowerCase()}`},status)),
                  h('td',null,p?h('div',{className:'room-patient'},h('strong',null,p.full_name),h('small',null,`${p.patient_id||'—'}${String(p.gender||'').toLowerCase()==='female'?' · Female':''}`),p.special_nurse_required?h('span',{className:'special-alert'},'Special nurse'):null):'—'),
                  h('td',null,canEdit?h('div',{className:'employee-actions'},h('button',{className:'btn btn-secondary',onClick:()=>openEdit(row)},'Edit'),h('button',{className:'btn btn-danger',disabled:!!p,onClick:()=>removeRoom(row)},'Delete')):h('span',{className:'small-note'},'View only'))
                );
              }),
              rows.length===0?h('tr',null,h('td',{colSpan:8,className:'empty'},'No rooms or beds configured.')):null
            )
          )
        )
      ),
      unassigned.length?h('div',{className:'card panel awaiting-room-panel'},
        h('div',{className:'panel-head'},h('div',null,h('h3',null,'Active Patients Awaiting Room / Bed'),h('small',null,'Assign directly from this list'))),
        h('div',{className:'unassigned-patient-list'},unassigned.map(p=>h('div',{className:'timeline-item awaiting-room-item',key:p.id},h('div',null,h('strong',null,`${p.patient_id||'—'} · ${p.full_name}`),h('span',null,`${p.patient_category||'Patient'}${p.special_nurse_required?' · Special nurse required':''}`)),canEdit?h('button',{className:'btn btn-secondary',onClick:()=>openNew(p.id)},'Assign Bed'):null)))
      ):null,
      show?h('div',{className:'modal-backdrop'},h('form',{className:'card modal room-bed-modal',onSubmit:save},
        h('div',{className:'panel-head'},h('div',null,h('h3',null,editing?'Edit Room / Bed':'Add Room / Bed'),h('small',null,'Configure capacity, rate, status and patient allocation')),h('button',{type:'button',className:'close',onClick:()=>setShow(false)},'×')),
        msg&&h('div',{className:'message error'},msg),
        h('div',{className:'modal-grid'},
          h('div',{className:'field'},h('label',null,'Room number'),h('select',{value:form.room_no,onChange:e=>setForm({...form,room_no:e.target.value}),required:true},ROOM_NUMBER_OPTIONS.map(n=>h('option',{key:n,value:n},n)))),h('div',{className:'field'},h('label',null,'Bed code'),h('select',{value:form.bed_no,onChange:e=>setForm({...form,bed_no:e.target.value}),required:true},BED_CODE_OPTIONS.map(n=>h('option',{key:n,value:n},n)))),
          miniSelect('Room type',form.room_type,['Private','Deluxe','Standard','General','Twin Sharing','Triple Sharing','Isolation','Rehabilitation'],v=>setForm({...form,room_type:v})),
          miniInput('Daily rate',form.daily_rate,v=>setForm({...form,daily_rate:v}),false,'number'),miniInput('Floor',form.floor,v=>setForm({...form,floor:v})),miniInput('Wing',form.wing,v=>setForm({...form,wing:v})),
          h('div',{className:'field'},h('label',null,'Status'),h('select',{className:`status-select status-select-${String(form.status).toLowerCase()}`,value:form.status,onChange:e=>setForm({...form,status:e.target.value})},h('option',{value:'Available',style:{backgroundColor:'#dff7e8',color:'#087a3d'}},'Available'),h('option',{value:'Occupied',style:{backgroundColor:'#ffe1e1',color:'#b42318'}},'Occupied'),h('option',{value:'Reserved',style:{backgroundColor:'#e3eeff',color:'#175cd3'}},'Reserved'),h('option',{value:'Maintenance',style:{backgroundColor:'#eeeeee',color:'#555'}},'Maintenance'))),
          h('div',{className:'field'},h('label',null,'Assign patient'),h('select',{value:form.patient_id,onChange:e=>setForm({...form,patient_id:e.target.value})},h('option',{value:''},'No patient / Available'),patients.map(p=>h('option',{key:p.id,value:p.id,style:{backgroundColor:String(p.gender||'').toLowerCase()==='female'?'#ffe4f1':'#ffffff',color:String(p.gender||'').toLowerCase()==='female'?'#a50f5d':'#063f36'}},`${p.patient_id||'NO-ID'} · ${p.full_name}${String(p.gender||'').toLowerCase()==='female'?' · Female':''}${p.room_no&&p.bed_no?` · currently ${p.room_no}-${p.bed_no}`:''}`)))),
          h('div',{className:'field span-2'},h('label',null,'Notes'),h('textarea',{value:form.notes,onChange:e=>setForm({...form,notes:e.target.value}),rows:3}))
        ),
        h('button',{className:'btn btn-primary full',disabled:busy},busy?'Saving…':editing?'Save Room / Bed':'Add Room / Bed')
      )):null
    );
  }

  function ClinicalDashboard({profile,onNavigate}){
    const [state,setState]=React.useState({loading:true,patients:[],medOrders:[],medLogs:[],careOrders:[],careLogs:[],vitals:[],physioOrders:[],physioSessions:[],incidents:[],handovers:[]});
    const today=new Date().toISOString().slice(0,10);
    const timeToMinutes=value=>{const text=String(value||'').trim();const m=text.match(/^(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):9999};
    const nowMinutes=new Date().getHours()*60+new Date().getMinutes();
    async function load(){
      const results=await Promise.all([
        client.from('patients').select('*').eq('is_active',true),
        client.from('medication_orders').select('*,patients(full_name,title,patient_id,room_no,bed_no)').eq('is_active',true),
        client.from('medication_administrations').select('*').eq('scheduled_date',today),
        client.from('care_orders').select('*,patients(full_name,title,patient_id,room_no,bed_no)').eq('is_active',true),
        client.from('care_logs').select('*').eq('care_date',today),
        client.from('vital_signs').select('*,patients(full_name,title,patient_id,room_no,bed_no)').gte('recorded_at',today+'T00:00:00').order('recorded_at',{ascending:false}),
        client.from('physiotherapy_plans').select('*,patients(full_name,title,patient_id,room_no,bed_no)').eq('is_active',true),
        client.from('physiotherapy_sessions').select('*').eq('session_date',today),
        client.from('incidents').select('*,patients(full_name,title,patient_id,room_no,bed_no)').eq('status','Open').order('incident_at',{ascending:false}),
        client.from('shift_handovers').select('*,profiles!shift_handovers_submitted_by_fkey(full_name,title)').order('created_at',{ascending:false}).limit(5)
      ]);
      const data=results.map(r=>r.data||[]);
      setState({loading:false,patients:data[0],medOrders:data[1],medLogs:data[2],careOrders:data[3],careLogs:data[4],vitals:data[5],physioOrders:data[6],physioSessions:data[7],incidents:data[8],handovers:data[9]});
    }
    React.useEffect(()=>{load();const ch=client.channel('clinical-dashboard-live').on('postgres_changes',{event:'*',schema:'public',table:'vital_signs'},load).on('postgres_changes',{event:'*',schema:'public',table:'medication_administrations'},load).on('postgres_changes',{event:'*',schema:'public',table:'care_logs'},load).on('postgres_changes',{event:'*',schema:'public',table:'incidents'},load).subscribe();return()=>client.removeChannel(ch)},[]);
    const medTasks=[];
    state.medOrders.forEach(order=>(order.scheduled_times||[]).forEach(time=>{const done=state.medLogs.some(log=>log.order_id===order.id&&String(log.scheduled_time||'').slice(0,5)===String(time).slice(0,5));if(!done)medTasks.push({order,time,overdue:timeToMinutes(time)<nowMinutes})}));
    const carePending=state.careOrders.filter(order=>!state.careLogs.some(log=>log.care_order_id===order.id));
    const vitalPatientIds=new Set(state.vitals.map(v=>v.patient_id));
    const vitalsPending=state.patients.filter(p=>!vitalPatientIds.has(p.id));
    const physioDoneIds=new Set(state.physioSessions.map(x=>x.order_id));
    const physioPending=state.physioOrders.filter(x=>!physioDoneIds.has(x.id));
    const patientName=row=>formalName(row?.patients||row)||row?.patients?.full_name||row?.full_name||'Patient';
    const cards=[
      ['Patients under care',state.patients.length,'Patients','👥','clinical-green'],
      ['Medicines due',medTasks.length,'Shift Tasks','💊',medTasks.some(x=>x.overdue)?'clinical-red':'clinical-blue'],
      ['Vitals pending',vitalsPending.length,'Vital Signs','🩺',vitalsPending.length?'clinical-amber':'clinical-green'],
      ['Care tasks pending',carePending.length,'Daily Care','✅',carePending.length?'clinical-amber':'clinical-green'],
      ['Physiotherapy pending',physioPending.length,'Physiotherapy','🏃','clinical-purple'],
      ['Open incidents',state.incidents.length,'Incidents','⚠️',state.incidents.length?'clinical-red':'clinical-green']
    ];
    return h(React.Fragment,null,
      h('div',{className:'clinical-welcome'},h('div',null,h('small',null,currentShift().toUpperCase()),h('h2',null,`Good ${new Date().getHours()<12?'Morning':new Date().getHours()<17?'Afternoon':'Evening'}, ${formalName(profile)}`),h('p',null,'Your clinical worklist for today — complete urgent and overdue items first.')),h('div',{className:'clinical-date'},`${new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',weekday:'long'}).format(new Date())}, ${formatDateIN(new Date())}`)),
      h('div',{className:'clinical-card-grid'},cards.map(([label,value,page,icon,tone])=>h('button',{type:'button',className:`clinical-metric ${tone}`,key:label,onClick:()=>onNavigate(page)},h('span',{className:'clinical-metric-icon'},icon),h('strong',null,value),h('span',null,label),h('small',null,`Open ${page} →`)))),
      h('div',{className:'clinical-columns'},
        h('section',{className:'card clinical-panel'},h('div',{className:'clinical-panel-head'},h('div',null,h('h3',null,'Priority Worklist'),h('small',null,'Overdue and pending tasks requiring attention')),h('button',{className:'btn btn-secondary',onClick:load},'Refresh')),
          medTasks.filter(x=>x.overdue).slice(0,5).map((x,i)=>h('div',{className:'clinical-work-row urgent',key:'m'+i},h('span',null,'💊'),h('div',null,h('strong',null,patientName(x.order)),h('small',null,`${x.order.medicine_name} ${x.order.dose||''} · Due ${x.time}`)),h('b',null,'OVERDUE'))),
          vitalsPending.slice(0,4).map(p=>h('div',{className:'clinical-work-row',key:p.id},h('span',null,'🩺'),h('div',null,h('strong',null,formalName(p)),h('small',null,`${p.patient_id||''} · Room ${p.room_no||'—'}-${p.bed_no||'—'} · Vitals not entered today`)),h('button',{className:'mini-link',onClick:()=>onNavigate('Vital Signs')},'Enter'))),
          !medTasks.some(x=>x.overdue)&&!vitalsPending.length&&h('div',{className:'clinical-empty'},'No urgent clinical tasks are pending at present.')),
        h('section',{className:'card clinical-panel'},h('div',{className:'clinical-panel-head'},h('div',null,h('h3',null,'Latest Shift Handover'),h('small',null,'Important information from the previous shift'))),
          state.handovers.length?state.handovers.slice(0,3).map(x=>h('div',{className:`handover-card ${String(x.priority||'').toLowerCase()}`,key:x.id},h('div',null,h('strong',null,`${x.shift} · ${x.priority}`),h('small',null,fmt(x.created_at))),h('p',null,x.patient_summary||'No patient summary.'),x.pending_tasks&&h('p',null,h('b',null,'Pending: '),x.pending_tasks),h('small',null,`Submitted by ${formalName(x.profiles||{})||x.profiles?.full_name||'Staff'}`))):h('div',{className:'clinical-empty'},'No shift handover has been submitted yet.'))
      )
    );
  }

  function DailyCare({profile}){
    const [patients]=usePatients();
    const [rows,setRows]=React.useState([]);
    const [form,setForm]=React.useState({patient_id:'',care_type:'Bathing assistance',shift:currentShift(),status:'Completed',remarks:''});
    const [saving,setSaving]=React.useState(false);
    const [toast,setToast]=React.useState(null);
    const toastTimer=React.useRef(null);

    function showToast(type,text){
      clearTimeout(toastTimer.current);
      setToast({type,text});
      toastTimer.current=setTimeout(()=>setToast(null),4500);
    }
    React.useEffect(()=>()=>clearTimeout(toastTimer.current),[]);

    async function load(){
      const {data,error}=await client
        .from('care_logs')
        .select('*,patients(full_name,room_no,bed_no)')
        .order('created_at',{ascending:false})
        .limit(100);
      if(error){
        console.error('Recent Daily Care records could not be loaded:',error);
        return false;
      }
      setRows(data||[]);
      return true;
    }
    React.useEffect(()=>{load()},[]);

    async function save(e){
      e.preventDefault();
      if(saving)return;
      if(!form.patient_id){
        showToast('error','Please select a patient before saving the care record.');
        return;
      }
      setSaving(true);
      const now=new Date();
      const payload={
        patient_id:form.patient_id,
        care_date:todayISOIndia(),
        shift:form.shift,
        status:form.status,
        completed_at:now.toISOString(),
        completed_by:profile.id,
        remarks:`${form.care_type}${form.remarks?.trim()?`: ${form.remarks.trim()}`:''}`
      };
      const {data,error}=await client.from('care_logs').insert(payload).select('id').single();
      if(error){
        console.error('Daily Care save failed:',error);
        showToast('error',error.message||'Daily care record could not be saved.');
        setSaving(false);
        return;
      }

      showToast('success',`${form.care_type} recorded successfully for the selected patient.`);
      setForm(current=>({...current,remarks:''}));
      await load();

      // Audit logging must never block the clinical save.
      writeAuditEvent(
        'Daily Care Recorded',
        'Daily Care',
        data?.id||form.patient_id,
        {
          patient_id:form.patient_id,
          care_activity:form.care_type,
          shift:form.shift,
          status:form.status,
          summary:`${form.care_type} — ${form.status}`
        },
        'Success'
      );
      setSaving(false);
    }

    return h(React.Fragment,null,
      h(Section,{title:'Daily Care Entry',subtitle:'Bath, restroom, hygiene, feeding, mobility and positioning'},
        h('form',{className:'modal-grid',onSubmit:save},
          patientSelect(patients,form.patient_id,v=>setForm({...form,patient_id:v})),
          miniSelect('Care activity',form.care_type,['Bathing assistance','Restroom assistance','Oral hygiene','Feeding assistance','Mobility assistance','Diaper change','Position change','Fluid monitoring','Sleep assistance'],v=>setForm({...form,care_type:v})),
          miniSelect('Shift',form.shift,['Day Shift (7 AM–7 PM)','Night Shift (7 PM–7 AM)'],v=>setForm({...form,shift:v})),
          miniSelect('Status',form.status,['Completed','Refused','Not required','Pending'],v=>setForm({...form,status:v})),
          miniInput('Remarks',form.remarks,v=>setForm({...form,remarks:v})),
          h('button',{className:'btn btn-primary',disabled:saving},saving?'Saving care record…':'Save care record')
        )
      ),
      h(LogTable,{
        title:'Recent Care Records',
        rows:rows.map(r=>[r.patients?.full_name,r.shift,r.status,r.remarks,fmt(r.created_at)]),
        heads:['Patient','Shift','Status','Activity / Remarks','Recorded']
      }),
      toast&&h('div',{className:`samara-toast ${toast.type}`,role:'status','aria-live':'polite'},
        h('span',{className:'samara-toast-icon','aria-hidden':'true'},toast.type==='success'?'✓':'!'),
        h('div',null,
          h('strong',null,toast.type==='success'?'Care record saved':'Save failed'),
          h('span',null,toast.text)
        ),
        h('button',{type:'button','aria-label':'Close notification',onClick:()=>setToast(null)},'×')
      )
    );
  }
  function VitalSigns({profile}){
    const [patients]=usePatients(),[rows,setRows]=React.useState([]),[selectedPatient,setSelectedPatient]=React.useState(''),[form,setForm]=React.useState({patient_id:'',temperature:'',systolic:'',diastolic:'',pulse:'',respiration:'',spo2:'',blood_sugar_type:'Not Taken',blood_sugar:'',weight:'',pain_score:'',remarks:''});
    const measured=value=>{if(value===null||value===undefined||String(value).trim()==='')return null;const n=Number(value);return Number.isFinite(n)&&n!==0?n:null};
    const tempC=value=>{const n=measured(value);if(n===null)return null;return n>=70&&n<=115?(n-32)*5/9:n};
    const calculateLevel=v=>{const systolic=measured(v.systolic),diastolic=measured(v.diastolic),pulse=measured(v.pulse),temperature=tempC(v.temperature),respiration=measured(v.respiration),spo2=measured(v.spo2),sugar=measured(v.blood_sugar);const any=[systolic,diastolic,pulse,temperature,respiration,spo2,sugar,measured(v.weight),v.pain_score!==''&&v.pain_score!==null?Number(v.pain_score):null].some(x=>x!==null);if(!any)return 'Not Recorded';if((spo2!==null&&spo2<90)||(systolic!==null&&(systolic>=180||systolic<80))||(diastolic!==null&&(diastolic>=120||diastolic<50))||(pulse!==null&&(pulse>130||pulse<40))||(temperature!==null&&(temperature>=39.5||temperature<35))||(respiration!==null&&(respiration>30||respiration<8))||(sugar!==null&&(sugar>400||sugar<50)))return 'Critical';if((spo2!==null&&spo2<94)||(systolic!==null&&(systolic>=160||systolic<90))||(diastolic!==null&&(diastolic>=100||diastolic<60))||(pulse!==null&&(pulse>110||pulse<50))||(temperature!==null&&(temperature>=38||temperature<35.5))||(respiration!==null&&(respiration>24||respiration<10))||(sugar!==null&&(sugar>250||sugar<70)))return 'Warning';return 'Normal'};
    async function load(){const {data}=await client.from('vital_signs').select('*,patients(full_name,title,patient_id,room_no,bed_no)').order('recorded_at',{ascending:false}).limit(150);setRows((data||[]).map(r=>({...r,computed_alert_level:calculateLevel(r)})))}
    React.useEffect(()=>{load();const ch=client.channel('vitals-live').on('postgres_changes',{event:'*',schema:'public',table:'vital_signs'},load).subscribe();return()=>client.removeChannel(ch)},[]);
    async function save(e){e.preventDefault();const sugarType=form.blood_sugar_type||'Not Taken';const sugarValue=sugarType==='Not Taken'?null:num(form.blood_sugar);if(sugarType!=='Not Taken'&&sugarValue===null)return window.alert('Please enter the blood sugar value for the selected test type.');const payload={...form,temperature:num(form.temperature),systolic:num(form.systolic),diastolic:num(form.diastolic),pulse:num(form.pulse),respiration:num(form.respiration),spo2:num(form.spo2),blood_sugar_type:sugarType,blood_sugar:sugarValue,weight:num(form.weight),pain_score:form.pain_score===''?null:Number(form.pain_score),recorded_at:new Date().toISOString(),recorded_by:profile.id};const level=calculateLevel(payload);if(level==='Not Recorded')return window.alert('Please enter at least one actual vital-sign measurement before saving.');payload.alert_level=level;const {error}=await client.from('vital_signs').insert(payload);if(error)return window.alert(error.message);setSelectedPatient(form.patient_id);setForm({...form,temperature:'',systolic:'',diastolic:'',pulse:'',respiration:'',spo2:'',blood_sugar_type:'Not Taken',blood_sugar:'',weight:'',pain_score:'',remarks:''});load()}
    const patientRows=selectedPatient?rows.filter(r=>r.patient_id===selectedPatient).slice(0,10):rows.slice(0,10);
    const latest=patientRows[0];
    const input=(label,key,unit,opts={})=>h('div',{className:'vital-input'},h('label',null,label),h('div',{className:'vital-input-wrap'},h('input',{type:'number',step:opts.step||'any',min:opts.min,max:opts.max,value:form[key],placeholder:opts.placeholder||'',disabled:Boolean(opts.disabled),onChange:e=>setForm({...form,[key]:e.target.value})}),unit&&h('span',null,unit)));
    return h(React.Fragment,null,
      h(Section,{title:'Vital Signs',subtitle:'Fast clinical observation entry with automatic Normal, Warning and Critical classification'},
        h('form',{className:'vitals-entry-card',onSubmit:save},
          h('div',{className:'vitals-patient-row'},patientSelect(patients,form.patient_id,v=>{setForm({...form,patient_id:v});setSelectedPatient(v)}),h('div',{className:`vital-live-status ${calculateLevel(form).toLowerCase().replace(' ','-')}`},h('small',null,'Current entry'),h('strong',null,calculateLevel(form)))),
          h('div',{className:'vitals-grid'},input('Temperature','temperature','°C / °F',{placeholder:'98.6'}),input('Systolic BP','systolic','mmHg'),input('Diastolic BP','diastolic','mmHg'),input('Pulse','pulse','/min'),input('Respiration','respiration','/min'),input('SpO₂','spo2','%'),h('div',{className:'vital-input'},h('label',null,'Blood Sugar Type'),h('select',{value:form.blood_sugar_type||'Not Taken',onChange:e=>setForm({...form,blood_sugar_type:e.target.value,blood_sugar:e.target.value==='Not Taken'?'':form.blood_sugar})},['Not Taken','FBS','PPBS','RBS'].map(x=>h('option',{value:x,key:x},x)))),input('Blood Sugar','blood_sugar','mg/dL',{disabled:(form.blood_sugar_type||'Not Taken')==='Not Taken'}),input('Weight','weight','kg',{step:'0.1'}),input('Pain Score','pain_score','/10',{min:0,max:10})),
          h('div',{className:'vitals-bottom'},h('div',{className:'field'},h('label',null,'Clinical remarks'),h('textarea',{rows:2,value:form.remarks,onChange:e=>setForm({...form,remarks:e.target.value}),placeholder:'Symptoms, oxygen support, position, food status or other observations'})),h('button',{className:'btn btn-primary vitals-save'},'Save Vital Signs')))),
      selectedPatient&&latest&&h('div',{className:'latest-vitals-strip'},h('div',null,h('small',null,'Latest for selected patient'),h('strong',null,formalName(latest.patients||{})||latest.patients?.full_name)),[['BP',`${measured(latest.systolic)??'—'}/${measured(latest.diastolic)??'—'}`],['Pulse',measured(latest.pulse)??'—'],['SpO₂',measured(latest.spo2)??'—'],['Sugar',measured(latest.blood_sugar)!==null?`${latest.blood_sugar_type||'RBS'} ${measured(latest.blood_sugar)}`:'—'],['Status',latest.computed_alert_level]].map(([a,b])=>h('div',{key:a},h('small',null,a),h('strong',null,b)))),
      h(LogTable,{title:selectedPatient?'Patient Vital Trend':'Recent Vital Signs',heads:['Patient','BP','Temp','Pulse','Resp.','SpO₂','Sugar Type','Sugar','Pain','Alert','Recorded'],rows:patientRows.map(r=>[formalName(r.patients||{})||r.patients?.full_name,`${measured(r.systolic)??'—'}/${measured(r.diastolic)??'—'}`,measured(r.temperature)??'—',measured(r.pulse)??'—',measured(r.respiration)??'—',measured(r.spo2)??'—',r.blood_sugar_type||'Not Taken',measured(r.blood_sugar)??'—',r.pain_score??'—',r.computed_alert_level,fmt(r.recorded_at)])})
    );
  }

  function Medicines({profile}){
    const today=new Date().toISOString().slice(0,10);
    const [state,setState]=React.useState({loading:true,orders:[],mar:[],patients:[],error:''});
    const [tab,setTab]=React.useState('Active Prescriptions');
    const [patientFilter,setPatientFilter]=React.useState('');
    const [marTarget,setMarTarget]=React.useState(null);
    const [marForm,setMarForm]=React.useState({scheduled_time:'',status:'Given',administered_at:'',remarks:'',late_entry_reason:'',late_entry_justification:''});
    const [marBusy,setMarBusy]=React.useState(false);
    const [marMessage,setMarMessage]=React.useState('');

    function localDateTimeValue(date=new Date()){
      const pad=n=>String(n).padStart(2,'0');
      return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }
    function parseTimes(value){
      if(Array.isArray(value))return value.filter(Boolean).map(normalizeMedicationTime).filter(Boolean);
      return String(value||'').split(',').map(normalizeMedicationTime).filter(Boolean);
    }
    function orderActive(order){
      if(order.is_active===false)return false;
      const status=String(order.status||'').trim().toLowerCase();
      if(['completed','discontinued','stopped','inactive'].includes(status))return false;
      const end=order.end_date||'';
      return !end||end>=today;
    }
    function patientFor(order){return state.patients.find(p=>p.id===order.patient_id)||{};}
    function patientLabel(order){
      const p=patientFor(order);
      const name=formalName(p)||p.full_name||'Patient';
      const room=p.room_no?`Room ${p.room_no}${p.bed_no?`-${p.bed_no}`:''}`:'Room not assigned';
      return `${name} · ${p.patient_id||'No ID'} · ${room}`;
    }
    function medicineLabel(order){return [order.medicine_name,order.strength||order.dose].filter(Boolean).join(' ');}
    function marFor(order){return state.mar.filter(x=>x.order_id===order.id);}
    function latestMar(order){return [...marFor(order)].sort((a,b)=>String(b.administered_at||b.created_at||'').localeCompare(String(a.administered_at||a.created_at||'')))[0];}
    function doseStatus(order,time){
      return state.mar.find(x=>x.order_id===order.id&&String(x.scheduled_date||'')===today&&String(x.scheduled_time||'').slice(0,5)===String(time||'').slice(0,5));
    }
    function firstPendingTime(order){
      const times=parseTimes(order.scheduled_times);
      return times.find(time=>!doseStatus(order,time))||times[0]||normalizeMedicationTime(`${String(new Date().getHours()).padStart(2,'0')}:00`);
    }
    function openMar(order,time=''){
      const scheduled=time||firstPendingTime(order);
      const existing=doseStatus(order,scheduled);
      setMarTarget(order);
      setMarForm({
        scheduled_time:scheduled,
        status:existing?.status||'Given',
        administered_at:existing?.administered_at?localDateTimeValue(new Date(existing.administered_at)):localDateTimeValue(),
        remarks:existing?.remarks||'',
        late_entry_reason:existing?.late_entry_reason||'',
        late_entry_justification:existing?.late_entry_justification||''
      });
      setMarMessage('');
    }
    function closeMar(){if(!marBusy){setMarTarget(null);setMarMessage('');}}
    async function saveMar(e){
      e.preventDefault();
      setMarMessage('');
      if(!marTarget)return;
      if(!marForm.scheduled_time){setMarMessage('Please select the scheduled medicine time.');return;}
      if(['Refused','Missed','Delayed'].includes(marForm.status)&&!String(marForm.remarks||'').trim()){
        setMarMessage(`Please enter the reason for medicine status “${marForm.status}”.`);return;
      }
      const entryTime=new Date();
      const administrationTime=marForm.administered_at?new Date(marForm.administered_at):entryTime;
      if(Number.isNaN(administrationTime.getTime())){setMarMessage('Please enter a valid administration time.');return;}
      if(administrationTime.getTime()>entryTime.getTime()+5*60*1000){setMarMessage('Administration time cannot be in the future.');return;}
      const entryDelayMinutes=Math.max(0,Math.round((entryTime.getTime()-administrationTime.getTime())/60000));
      const isLateEntry=entryDelayMinutes>30;
      if(isLateEntry&&!String(marForm.late_entry_reason||'').trim()){
        setMarMessage('This is a late entry. Please select a justification category.');return;
      }
      if(isLateEntry&&!String(marForm.late_entry_justification||'').trim()){
        setMarMessage('Please enter a detailed justification for the late entry.');return;
      }
      setMarBusy(true);
      const {data:{user}}=await client.auth.getUser();
      const payload={
        order_id:marTarget.id,
        patient_id:marTarget.patient_id,
        scheduled_date:today,
        scheduled_time:normalizeMedicationTime(marForm.scheduled_time),
        status:marForm.status,
        administered_at:administrationTime.toISOString(),
        administered_by:user?.id||profile?.auth_user_id||profile?.id,
        remarks:String(marForm.remarks||'').trim(),
        entry_recorded_at:entryTime.toISOString(),
        late_entry:isLateEntry,
        entry_delay_minutes:entryDelayMinutes,
        late_entry_reason:isLateEntry?String(marForm.late_entry_reason||'').trim():null,
        late_entry_justification:isLateEntry?String(marForm.late_entry_justification||'').trim():null
      };
      const {error}=await client.from('medication_administrations').insert(payload);
      if(error){setMarMessage(error.message||'Unable to save the Medication Administration Record.');setMarBusy(false);return;}
      setMarBusy(false);setMarTarget(null);setTab('Today’s MAR');await load();
    }

    async function load(){
      setState(current=>({...current,loading:true,error:''}));
      const [ordersResult,marResult,patientsResult]=await Promise.all([
        client.from('medication_orders').select('*').order('created_at',{ascending:false}),
        client.from('medication_administrations').select('*').order('scheduled_date',{ascending:false}).order('scheduled_time',{ascending:false}).limit(1000),
        client.from('patients').select('id,title,full_name,patient_id,room_no,bed_no,is_active').order('full_name')
      ]);
      const errors=[ordersResult.error,marResult.error,patientsResult.error].filter(Boolean);
      setState({loading:false,orders:ordersResult.data||[],mar:marResult.data||[],patients:patientsResult.data||[],error:errors.map(e=>e.message).join(' | ')});
    }
    React.useEffect(()=>{
      load();
      const ch=client.channel('medicines-register-live')
        .on('postgres_changes',{event:'*',schema:'public',table:'medication_orders'},load)
        .on('postgres_changes',{event:'*',schema:'public',table:'medication_administrations'},load)
        .subscribe();
      return()=>client.removeChannel(ch);
    },[]);

    const activeOrders=state.orders.filter(orderActive);
    const todayRows=[];
    activeOrders.forEach(order=>parseTimes(order.scheduled_times).forEach(time=>todayRows.push({order,time,log:doseStatus(order,time)})));
    const missedRows=todayRows.filter(x=>x.log&&['missed','refused','delayed','not given'].includes(String(x.log.status||'').toLowerCase()));
    const completedOrders=state.orders.filter(o=>String(o.status||'').toLowerCase()==='completed'||(o.end_date&&o.end_date<today&&o.is_active!==false));
    const discontinuedOrders=state.orders.filter(o=>o.is_active===false||['discontinued','stopped','inactive'].includes(String(o.status||'').toLowerCase()));
    const filtered=rows=>patientFilter?rows.filter(item=>(item.order||item).patient_id===patientFilter):rows;
    const tabs=[['Active Prescriptions',activeOrders.length],['Today’s MAR',todayRows.length],['Missed Medicines',missedRows.length],['Completed Medicines',completedOrders.length],['Discontinued Medicines',discontinuedOrders.length]];

    const prescriptionRows=orders=>filtered(orders).map(order=>[
      patientLabel(order),medicineLabel(order),order.route||'—',order.frequency||'—',order.duration||'—',parseTimes(order.scheduled_times).map(medicationTimeLabel).join(', ')||'—',order.food_instruction||'—',order.special_instruction||order.special_instructions||'—',latestMar(order)?.status||'No MAR yet',
      h('button',{type:'button',className:'btn btn-primary',onClick:()=>openMar(order)},'Administer')
    ]);
    const marRows=items=>filtered(items).map(item=>[
      patientLabel(item.order),medicineLabel(item.order),medicationTimeLabel(item.time),item.log?.status||'Pending',item.log?.administered_at?fmt(item.log.administered_at):'—',item.log?.entry_recorded_at?fmt(item.log.entry_recorded_at):(item.log?.created_at?fmt(item.log.created_at):'—'),item.log?.late_entry?`Late entry (${item.log.entry_delay_minutes||0} min) · ${item.log.late_entry_reason||'Justification recorded'}`:'On-time entry',item.log?.remarks||'—',
      h('button',{type:'button',className:item.log?'btn btn-secondary':'btn btn-primary',onClick:()=>openMar(item.order,item.time)},item.log?'View / Correct':'Record Dose')
    ]);

    let table=null;
    if(tab==='Active Prescriptions')table=h(LogTable,{title:'Active Prescription Register',subtitle:'Current medicines transcribed during admission or patient update',heads:['Patient','Medicine / Strength','Route','Frequency','Duration','Time','Food','Special instruction','Latest MAR','Action'],rows:prescriptionRows(activeOrders)});
    if(tab==='Today’s MAR')table=h(LogTable,{title:"Today’s Medication Administration",subtitle:'Scheduled doses and current administration status',heads:['Patient','Medicine','Time','Status','Administered','Entry recorded','Entry audit','Remarks','Action'],rows:marRows(todayRows)});
    if(tab==='Missed Medicines')table=h(LogTable,{title:'Missed / Refused / Delayed Medicines',subtitle:'Medicine exceptions requiring clinical review',heads:['Patient','Medicine','Time','Status','Administered','Entry recorded','Entry audit','Reason / Remarks','Action'],rows:marRows(missedRows)});
    if(tab==='Completed Medicines')table=h(LogTable,{title:'Completed Medicine Courses',subtitle:'Prescription courses completed by status or end date',heads:['Patient','Medicine / Strength','Route','Frequency','Duration','Time','Food','Special instruction','Latest MAR','Action'],rows:prescriptionRows(completedOrders)});
    if(tab==='Discontinued Medicines')table=h(LogTable,{title:'Discontinued Medicines',subtitle:'Stopped or inactive prescriptions retained for history',heads:['Patient','Medicine / Strength','Route','Frequency','Duration','Time','Food','Special instruction','Latest MAR'],rows:prescriptionRows(discontinuedOrders).map(row=>row.slice(0,-1))});

    const targetTimes=marTarget?parseTimes(marTarget.scheduled_times):[];
    const currentEntryDelay=marForm.administered_at?Math.max(0,Math.round((Date.now()-new Date(marForm.administered_at).getTime())/60000)):0;
    const currentIsLateEntry=currentEntryDelay>30;
    const lateEntryReasons=['Forgot to record immediately','Emergency patient care','Network or device issue','Medicine administered by another staff member','Patient-related delay','Doctor instruction','Other'];
    return h(React.Fragment,null,
      h(Section,{title:'Medication Administration & Prescription Register',subtitle:'Unified prescription history and MAR status from the patient record'},
        state.error&&h('div',{className:'message error'},`Unable to load part of the medication register: ${state.error}`),
        h('div',{className:'panel-head'},
          h('div',{className:'field',style:{minWidth:'260px',marginBottom:0}},h('label',null,'Patient filter'),h('select',{value:patientFilter,onChange:e=>setPatientFilter(e.target.value)},h('option',{value:''},'All patients'),state.patients.filter(p=>p.is_active!==false).map(p=>h('option',{key:p.id,value:p.id},`${formalName(p)||p.full_name} · ${p.patient_id||'No ID'}`)))),
          h('button',{type:'button',className:'btn btn-secondary',onClick:load},state.loading?'Loading…':'Refresh')
        ),
        h('div',{className:'time-chip-list',style:{marginTop:'16px'}},tabs.map(([name,count])=>h('button',{type:'button',key:name,className:`btn ${tab===name?'btn-primary':'btn-secondary'}`,onClick:()=>setTab(name)},`${name} (${count})`)))
      ),
      state.loading?h('div',{className:'card panel loading'},'Loading medication register…'):table,
      marTarget&&h('div',{className:'modal-backdrop',onClick:e=>{if(e.target===e.currentTarget)closeMar()}},
        h('form',{className:'card modal',onSubmit:saveMar},
          h('div',{className:'panel-head'},h('div',null,h('h3',null,'Medication Administration'),h('small',null,'Record each dose without overwriting prescription history')),h('button',{type:'button',className:'close',onClick:closeMar},'×')),
          marMessage&&h('div',{className:'message error'},marMessage),
          h('div',{className:'modal-grid'},
            h('div',{className:'field'},h('label',null,'Patient'),h('input',{value:patientLabel(marTarget),readOnly:true})),
            h('div',{className:'field'},h('label',null,'Medicine'),h('input',{value:medicineLabel(marTarget),readOnly:true})),
            h('div',{className:'field'},h('label',null,'Route'),h('input',{value:marTarget.route||'—',readOnly:true})),
            h('div',{className:'field'},h('label',null,'Frequency'),h('input',{value:marTarget.frequency||'—',readOnly:true})),
            h('div',{className:'field'},h('label',null,'Scheduled Time'),h('select',{value:marForm.scheduled_time,onChange:e=>setMarForm({...marForm,scheduled_time:e.target.value})},(targetTimes.length?targetTimes:[marForm.scheduled_time]).filter(Boolean).map(time=>h('option',{key:time,value:time},medicationTimeLabel(time))))),
            h('div',{className:'field'},h('label',null,'Status'),h('select',{value:marForm.status,onChange:e=>setMarForm({...marForm,status:e.target.value})},['Given','Delayed','Refused','Missed'].map(status=>h('option',{key:status,value:status},status)))),
            h('div',{className:'field span-2'},h('label',null,'Actual Administration Time'),h('input',{type:'datetime-local',value:marForm.administered_at,onChange:e=>setMarForm({...marForm,administered_at:e.target.value}),required:true}),h('small',null,'The system records the MAR entry time automatically and staff cannot edit it.')),
            currentIsLateEntry&&h('div',{className:'message warning span-2'},`Late entry detected: this record is being entered approximately ${currentEntryDelay} minutes after the stated administration time. Justification is compulsory.`),
            currentIsLateEntry&&h('div',{className:'field'},h('label',null,'Late Entry Reason'),h('select',{value:marForm.late_entry_reason,onChange:e=>setMarForm({...marForm,late_entry_reason:e.target.value}),required:true},h('option',{value:''},'Select reason'),lateEntryReasons.map(reason=>h('option',{key:reason,value:reason},reason)))),
            currentIsLateEntry&&h('div',{className:'field'},h('label',null,'Entry Delay'),h('input',{value:`${currentEntryDelay} minutes`,readOnly:true})),
            currentIsLateEntry&&h('div',{className:'field span-2'},h('label',null,'Detailed Late Entry Justification'),h('textarea',{rows:3,value:marForm.late_entry_justification,onChange:e=>setMarForm({...marForm,late_entry_justification:e.target.value}),placeholder:'Explain why the medicine was not documented immediately, who administered it, and any verification performed.',required:true})),
            h('div',{className:'field span-2'},h('label',null,marForm.status==='Given'?'Clinical Remarks (optional)':'Reason / Clinical Remarks (required)'),h('textarea',{rows:4,value:marForm.remarks,onChange:e=>setMarForm({...marForm,remarks:e.target.value}),placeholder:marForm.status==='Given'?'Any observation after administration':'Enter the medicine exception reason and action taken',required:marForm.status!=='Given'}))
          ),
          h('div',{className:'modal-actions'},h('button',{type:'button',className:'btn btn-secondary',onClick:closeMar,disabled:marBusy},'Cancel'),h('button',{className:'btn btn-primary',disabled:marBusy},marBusy?'Saving MAR…':'Save MAR'))
        )
      )
    );
  }


  function MedicationErrors({profile,onNavigate}){
    const today=new Date().toISOString().slice(0,10);
    const [state,setState]=React.useState({loading:true,errors:[],orders:[],mar:[],patients:[],profiles:[],message:''});
    const [fromDate,setFromDate]=React.useState(today);
    const [toDate,setToDate]=React.useState(today);
    const [patientFilter,setPatientFilter]=React.useState('');
    const [typeFilter,setTypeFilter]=React.useState('All');
    const [statusFilter,setStatusFilter]=React.useState('All');
    const [showForm,setShowForm]=React.useState(false);
    const [showReport,setShowReport]=React.useState(false);
    const [reviewTarget,setReviewTarget]=React.useState(null);
    const [reviewForm,setReviewForm]=React.useState({status:'Under Review',investigation:'',root_cause:'',corrective_action:'',preventive_action:'',manager_note:'',doctor_notification:'',resident_outcome:''});
    const [form,setForm]=React.useState({patient_id:'',order_id:'',error_type:'Wrong Dose',severity:'Moderate',occurred_at:'',description:'',immediate_action:'',patient_effect:'No apparent harm',doctor_informed:false,family_informed:false});
    const [busy,setBusy]=React.useState(false);

    const ERROR_TYPES=['Delay','Missed Dose','Omission','Wrong Dose','Wrong Medicine','Wrong Route','Wrong Time','Wrong Patient','Duplicate Dose','Documentation Delay','Other'];
    const SEVERITIES=['Near Miss','Minor','Moderate','Major','Critical'];
    const WORKFLOW=['Open','Under Review','Corrective Action','Closed'];
    const localDateTimeValue=(date=new Date())=>{const pad=n=>String(n).padStart(2,'0');return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;};
    const patientById=id=>state.patients.find(p=>p.id===id)||{};
    const orderById=id=>state.orders.find(o=>o.id===id)||{};
    const staffById=id=>state.profiles.find(p=>p.id===id||p.auth_user_id===id)||{};
    const patientName=id=>{const p=patientById(id);return formalName(p)||p.full_name||'Unknown patient';};
    const medicineName=orderId=>{const o=orderById(orderId);return [o.medicine_name,o.strength||o.dose].filter(Boolean).join(' ')||'Medicine not specified';};
    const dateOnly=value=>String(value||'').slice(0,10);
    const isBetween=value=>{const d=dateOnly(value);return d&&d>=fromDate&&d<=toDate;};
    const minutesDifference=(a,b)=>Math.round((new Date(a)-new Date(b))/60000);

    async function load(){
      setState(current=>({...current,loading:true,message:''}));
      const [errors,orders,mar,patients,profiles]=await Promise.all([
        client.from('medication_errors').select('*').order('occurred_at',{ascending:false}).limit(1000),
        client.from('medication_orders').select('*').order('created_at',{ascending:false}),
        client.from('medication_administrations').select('*').order('scheduled_date',{ascending:false}).limit(3000),
        client.from('patients').select('id,title,full_name,patient_id,room_no,bed_no,is_active').order('full_name'),
        client.from('profiles').select('id,auth_user_id,title,full_name,role').order('full_name')
      ]);
      const error=[errors.error,orders.error,mar.error,patients.error,profiles.error].filter(Boolean).map(e=>e.message).join(' | ');
      setState({loading:false,errors:errors.data||[],orders:orders.data||[],mar:mar.data||[],patients:patients.data||[],profiles:profiles.data||[],message:error});
    }
    React.useEffect(()=>{load();const ch=client.channel('medication-errors-live').on('postgres_changes',{event:'*',schema:'public',table:'medication_errors'},load).on('postgres_changes',{event:'*',schema:'public',table:'medication_administrations'},load).subscribe();return()=>client.removeChannel(ch)},[]);

    function autoDetected(){
      const rows=[];
      state.mar.filter(r=>isBetween(r.scheduled_date||r.administered_at||r.created_at)).forEach(r=>{
        const status=String(r.status||'').toLowerCase();
        const base={source:'Automatic MAR analysis',patient_id:r.patient_id,order_id:r.order_id,occurred_at:r.administered_at||r.entry_recorded_at||r.created_at,error_id:`auto-${r.id}`,status:'Detected'};
        if(status==='missed'||status==='not given')rows.push({...base,error_type:'Missed Dose',severity:'Major',description:r.remarks||'Scheduled medicine was recorded as missed.'});
        if(status==='refused')rows.push({...base,error_type:'Omission',severity:'Moderate',description:r.remarks||'Medicine was not administered because the resident refused.'});
        if(status==='delayed')rows.push({...base,error_type:'Delay',severity:'Moderate',description:r.remarks||'Medicine administration was recorded as delayed.'});
        if(r.late_entry)rows.push({...base,error_type:'Documentation Delay',severity:'Minor',description:`Documentation was entered ${r.entry_delay_minutes||0} minutes late. ${r.late_entry_reason||''} ${r.late_entry_justification||''}`.trim()});
        if(r.administered_at&&r.scheduled_date&&r.scheduled_time){
          const scheduled=new Date(`${r.scheduled_date}T${String(r.scheduled_time).slice(0,5)}:00`);
          const diff=minutesDifference(r.administered_at,scheduled);
          if(diff>30&&status==='given')rows.push({...base,error_type:'Delay',severity:diff>120?'Major':'Moderate',description:`Medicine was administered approximately ${diff} minutes after the scheduled time.`});
        }
      });
      return rows;
    }

    const manual=state.errors.filter(r=>isBetween(r.occurred_at||r.created_at)).map(r=>({...r,source:'Staff reported'}));
    const combined=[...manual,...autoDetected()].filter(r=>
      (!patientFilter||r.patient_id===patientFilter)&&
      (typeFilter==='All'||r.error_type===typeFilter)&&
      (statusFilter==='All'||String(r.status||'Detected')===statusFilter)
    );
    const counts=ERROR_TYPES.reduce((a,t)=>(a[t]=combined.filter(r=>r.error_type===t).length,a),{});
    const severityCounts=SEVERITIES.reduce((a,t)=>(a[t]=combined.filter(r=>r.severity===t).length,a),{});
    const total=combined.length;
    const high=combined.filter(r=>['Major','Critical'].includes(r.severity)).length;
    const openCount=combined.filter(r=>!['Closed','Reviewed'].includes(String(r.status||'Detected'))).length;
    const affectedPatients=new Set(combined.map(r=>r.patient_id).filter(Boolean)).size;
    const dominant=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
    const safetyScore=Math.max(0,100-(high*12)-((total-high)*3));

    function aiSummary(){
      if(!total)return 'No medication errors or significant MAR exceptions were identified for the selected period.';
      const parts=[];
      parts.push(`${total} medication-related event${total===1?' was':'s were'} identified involving ${affectedPatients} resident${affectedPatients===1?'':'s'}.`);
      if(dominant&&dominant[1])parts.push(`${dominant[0]} was the most frequent category (${dominant[1]} event${dominant[1]===1?'':'s'}).`);
      if(high)parts.push(`${high} event${high===1?' requires':'s require'} priority Admin/Manager review because the recorded severity is Major or Critical.`);
      const delayCount=(counts.Delay||0)+(counts['Documentation Delay']||0);if(delayCount)parts.push(`${delayCount} delay-related event${delayCount===1?'':'s'} suggest reviewing medicine-round timing, staffing and immediate documentation practices.`);
      const missed=(counts['Missed Dose']||0)+(counts.Omission||0);if(missed)parts.push(`${missed} missed or omitted dose${missed===1?'':'s'} should be clinically reviewed for resident impact, doctor notification and corrective action.`);
      if((counts['Wrong Dose']||0)||(counts['Wrong Medicine']||0)||(counts['Wrong Patient']||0))parts.push('Wrong-dose, wrong-medicine or wrong-patient reports require prompt clinical assessment, prescriber notification and a documented root-cause review.');
      return parts.join(' ');
    }

    async function save(e){
      e.preventDefault();
      if(!form.patient_id||!form.error_type||!form.description.trim())return alert('Patient, error type and description are required.');
      setBusy(true);
      const {data:{user}}=await client.auth.getUser();
      const payload={...form,order_id:form.order_id||null,occurred_at:form.occurred_at?new Date(form.occurred_at).toISOString():new Date().toISOString(),reported_by:user?.id||profile?.auth_user_id||profile?.id,status:'Open'};
      const {error}=await client.from('medication_errors').insert(payload);
      setBusy(false);if(error)return alert(error.message);
      setShowForm(false);setForm({patient_id:'',order_id:'',error_type:'Wrong Dose',severity:'Moderate',occurred_at:'',description:'',immediate_action:'',patient_effect:'No apparent harm',doctor_informed:false,family_informed:false});load();
    }

    function openReview(row){
      if(row.source!=='Staff reported')return alert('Automatically detected events must first be reported as a medication error before formal closure.');
      setReviewTarget(row);
      setReviewForm({
        status:row.status==='Reviewed'?'Closed':(row.status||'Under Review'),
        investigation:row.investigation||'',
        root_cause:row.root_cause||'',
        corrective_action:row.corrective_action||'',
        preventive_action:row.preventive_action||'',
        manager_note:row.review_note||row.manager_note||'',
        doctor_notification:row.doctor_notification||'',
        resident_outcome:row.resident_outcome||row.patient_effect||''
      });
    }

    async function saveReview(e){
      e.preventDefault();
      if(!reviewTarget)return;
      if(['Corrective Action','Closed'].includes(reviewForm.status)&&!reviewForm.corrective_action.trim())return alert('Corrective action is required before progressing or closing the event.');
      if(reviewForm.status==='Closed'&&!reviewForm.root_cause.trim())return alert('Root cause is required before closing the event.');
      setBusy(true);
      const {data:{user}}=await client.auth.getUser();
      const payload={
        status:reviewForm.status,
        investigation:reviewForm.investigation||null,
        root_cause:reviewForm.root_cause||null,
        corrective_action:reviewForm.corrective_action||null,
        preventive_action:reviewForm.preventive_action||null,
        review_note:reviewForm.manager_note||null,
        doctor_notification:reviewForm.doctor_notification||null,
        resident_outcome:reviewForm.resident_outcome||null,
        reviewed_by:user?.id||profile?.id,
        reviewed_at:new Date().toISOString(),
        closed_by:reviewForm.status==='Closed'?(user?.id||profile?.id):null,
        closed_at:reviewForm.status==='Closed'?new Date().toISOString():null
      };
      const {error}=await client.from('medication_errors').update(payload).eq('id',reviewTarget.id);
      setBusy(false);if(error)return alert(error.message);
      setReviewTarget(null);load();
    }

    function csvExport(){
      const headers=['Patient','Medicine','Error Type','Severity','Description','Source','Occurred At','Status','Root Cause','Corrective Action','Preventive Action'];
      const lines=[headers,...combined.map(r=>[
        patientName(r.patient_id),medicineName(r.order_id),r.error_type,r.severity||'',r.description||'',r.source,fmt(r.occurred_at||r.created_at),r.status||'Detected',r.root_cause||'',r.corrective_action||'',r.preventive_action||''
      ])].map(row=>row.map(value=>`"${String(value??'').replace(/"/g,'""')}"`).join(',')).join('\n');
      const blob=new Blob([lines],{type:'text/csv;charset=utf-8'});
      const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`Medication_Safety_${fromDate}_to_${toDate}.csv`;a.click();URL.revokeObjectURL(url);
    }

    function printCurrentReport(){
      const report=document.getElementById('medication-safety-report');
      if(!report)return;
      const win=window.open('','_blank');if(!win)return alert('Please allow pop-ups to print the report.');
      win.document.write(`<!doctype html><html><head><title>Medication Safety Report</title><style>body{font-family:Arial;padding:24px;color:#183b35}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #bbb;padding:6px;text-align:left;vertical-align:top}th{background:#e7f3f0}.no-print{display:none}.card{border:1px solid #d7e7e2;border-radius:12px;padding:14px;margin:12px 0}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.stat strong{display:block;font-size:24px;color:#087565}h1,h2{color:#087565}</style></head><body>${report.innerHTML}</body></html>`);
      win.document.close();setTimeout(()=>{win.focus();win.print()},250);
    }

    const reportTable=h('div',{className:'table-wrap'},h('table',{className:'table'},
      h('thead',null,h('tr',null,['Patient','Medicine','Error','Severity','Finding / Description','Source','Time','Status','Action'].map(x=>h('th',{key:x},x)))),
      h('tbody',null,
        combined.map((r,index)=>h('tr',{key:r.id||r.error_id||index},
          h('td',null,patientName(r.patient_id)),
          h('td',null,medicineName(r.order_id)),
          h('td',null,r.error_type),
          h('td',null,h('span',{className:`badge ${['Major','Critical'].includes(r.severity)?'off':''}`},r.severity||'—')),
          h('td',null,r.description||'—'),
          h('td',null,r.source),
          h('td',null,fmt(r.occurred_at||r.created_at)),
          h('td',null,r.status||'Detected'),
          h('td',null,r.source==='Staff reported'?h('button',{type:'button',className:'btn btn-secondary',onClick:()=>openReview(r)},'Review / CAPA'):h('span',{className:'small-note'},'Auto detected'))
        )),
        combined.length===0?h('tr',null,h('td',{colSpan:9,className:'empty'},'No medication safety events found for the selected filters.')):null
      )
    ));

    return h(React.Fragment,null,
      h('div',{className:'grid stats'},
        [['Safety Score',`${safetyScore}%`],['Total Events',total],['Open Review',openCount],['Major / Critical',high],['Residents Affected',affectedPatients]].map(([label,value])=>h('div',{className:'card stat',key:label},h('span',null,label),h('strong',null,value)))
      ),
      h(Section,{title:'Medication Safety Centre',subtitle:'AI-assisted detection, investigation, corrective action and management closure'},
        state.message&&h('div',{className:'message error'},state.message),
        h('div',{className:'modal-grid'},
          h('div',{className:'field'},h('label',null,'From date'),h('input',{type:'date',value:fromDate,onChange:e=>setFromDate(e.target.value)})),
          h('div',{className:'field'},h('label',null,'To date'),h('input',{type:'date',value:toDate,onChange:e=>setToDate(e.target.value)})),
          h('div',{className:'field'},h('label',null,'Patient'),h('select',{value:patientFilter,onChange:e=>setPatientFilter(e.target.value)},h('option',{value:''},'All patients'),state.patients.map(p=>h('option',{key:p.id,value:p.id},formalName(p)||p.full_name)))),
          h('div',{className:'field'},h('label',null,'Error type'),h('select',{value:typeFilter,onChange:e=>setTypeFilter(e.target.value)},h('option',{value:'All'},'All error types'),ERROR_TYPES.map(t=>h('option',{key:t,value:t},t)))),
          h('div',{className:'field'},h('label',null,'Workflow status'),h('select',{value:statusFilter,onChange:e=>setStatusFilter(e.target.value)},['All','Detected',...WORKFLOW,'Reviewed'].map(t=>h('option',{key:t,value:t},t)))),
          h('button',{type:'button',className:'btn btn-secondary',onClick:load},state.loading?'Loading…':'Refresh'),
          h('button',{type:'button',className:'btn btn-primary',onClick:()=>{setForm({...form,occurred_at:localDateTimeValue()});setShowForm(true)}},'Report Medication Error'),
          h('button',{type:'button',className:'btn btn-secondary',onClick:()=>setShowReport(true)},'View Management Report')
        ),
        h('div',{className:'card panel',style:{marginTop:'16px'}},h('h3',null,'AI-assisted management summary'),h('p',null,aiSummary()))
      ),
      reportTable,

      showForm&&h('div',{className:'modal-backdrop',onClick:e=>{if(e.target===e.currentTarget)setShowForm(false)}},
        h('form',{className:'card modal',onSubmit:save},
          h('div',{className:'panel-head'},h('div',null,h('h3',null,'Report Medication Error'),h('small',null,'Wrong dose, medicine, patient, route, timing, omission or other event')),h('button',{type:'button',className:'close',onClick:()=>setShowForm(false)},'×')),
          h('div',{className:'modal-grid'},
            h('div',{className:'field'},h('label',null,'Patient'),h('select',{required:true,value:form.patient_id,onChange:e=>setForm({...form,patient_id:e.target.value,order_id:''})},h('option',{value:''},'Select patient'),state.patients.map(p=>h('option',{key:p.id,value:p.id},formalName(p)||p.full_name)))),
            h('div',{className:'field'},h('label',null,'Prescription / Medicine'),h('select',{value:form.order_id,onChange:e=>setForm({...form,order_id:e.target.value})},h('option',{value:''},'Not linked / other'),state.orders.filter(o=>!form.patient_id||o.patient_id===form.patient_id).map(o=>h('option',{key:o.id,value:o.id},medicineName(o.id))))),
            h('div',{className:'field'},h('label',null,'Error type'),h('select',{value:form.error_type,onChange:e=>setForm({...form,error_type:e.target.value})},ERROR_TYPES.map(t=>h('option',{key:t,value:t},t)))),
            h('div',{className:'field'},h('label',null,'Severity'),h('select',{value:form.severity,onChange:e=>setForm({...form,severity:e.target.value})},SEVERITIES.map(t=>h('option',{key:t,value:t},t)))),
            h('div',{className:'field'},h('label',null,'Occurred at'),h('input',{type:'datetime-local',value:form.occurred_at,onChange:e=>setForm({...form,occurred_at:e.target.value})})),
            h('div',{className:'field span-2'},h('label',null,'Description'),h('textarea',{required:true,rows:3,value:form.description,onChange:e=>setForm({...form,description:e.target.value})})),
            h('div',{className:'field span-2'},h('label',null,'Immediate action taken'),h('textarea',{rows:2,value:form.immediate_action,onChange:e=>setForm({...form,immediate_action:e.target.value})})),
            h('div',{className:'field'},h('label',null,'Resident effect'),h('input',{value:form.patient_effect,onChange:e=>setForm({...form,patient_effect:e.target.value})})),
            h('label',{className:'checkbox'},h('input',{type:'checkbox',checked:form.doctor_informed,onChange:e=>setForm({...form,doctor_informed:e.target.checked})}),'Doctor informed'),
            h('label',{className:'checkbox'},h('input',{type:'checkbox',checked:form.family_informed,onChange:e=>setForm({...form,family_informed:e.target.checked})}),'Family informed')
          ),
          h('div',{className:'actions'},h('button',{type:'button',className:'btn btn-secondary',onClick:()=>setShowForm(false)},'Cancel'),h('button',{className:'btn btn-primary',disabled:busy},busy?'Saving…':'Save Medication Error'))
        )
      ),

      reviewTarget&&h('div',{className:'modal-backdrop',onClick:e=>{if(e.target===e.currentTarget)setReviewTarget(null)}},
        h('form',{className:'card modal',style:{width:'min(980px,96vw)',maxHeight:'92vh',overflow:'auto'},onSubmit:saveReview},
          h('div',{className:'panel-head'},h('div',null,h('h3',null,'Medication Error Review & CAPA'),h('small',null,`${patientName(reviewTarget.patient_id)} · ${medicineName(reviewTarget.order_id)} · ${reviewTarget.error_type}`)),h('button',{type:'button',className:'close',onClick:()=>setReviewTarget(null)},'×')),
          h('div',{className:'modal-grid'},
            h('div',{className:'field'},h('label',null,'Workflow status'),h('select',{value:reviewForm.status,onChange:e=>setReviewForm({...reviewForm,status:e.target.value})},WORKFLOW.map(x=>h('option',{key:x,value:x},x)))),
            h('div',{className:'field span-2'},h('label',null,'Investigation findings'),h('textarea',{rows:3,value:reviewForm.investigation,onChange:e=>setReviewForm({...reviewForm,investigation:e.target.value})})),
            h('div',{className:'field span-2'},h('label',null,'Root cause'),h('textarea',{rows:3,value:reviewForm.root_cause,onChange:e=>setReviewForm({...reviewForm,root_cause:e.target.value})})),
            h('div',{className:'field span-2'},h('label',null,'Corrective action'),h('textarea',{rows:3,value:reviewForm.corrective_action,onChange:e=>setReviewForm({...reviewForm,corrective_action:e.target.value})})),
            h('div',{className:'field span-2'},h('label',null,'Preventive action (CAPA)'),h('textarea',{rows:3,value:reviewForm.preventive_action,onChange:e=>setReviewForm({...reviewForm,preventive_action:e.target.value})})),
            h('div',{className:'field'},h('label',null,'Doctor notification / instruction'),h('textarea',{rows:2,value:reviewForm.doctor_notification,onChange:e=>setReviewForm({...reviewForm,doctor_notification:e.target.value})})),
            h('div',{className:'field'},h('label',null,'Resident outcome'),h('textarea',{rows:2,value:reviewForm.resident_outcome,onChange:e=>setReviewForm({...reviewForm,resident_outcome:e.target.value})})),
            h('div',{className:'field span-2'},h('label',null,'Manager review note'),h('textarea',{rows:2,value:reviewForm.manager_note,onChange:e=>setReviewForm({...reviewForm,manager_note:e.target.value})}))
          ),
          h('div',{className:'actions'},h('button',{type:'button',className:'btn btn-secondary',onClick:()=>setReviewTarget(null)},'Cancel'),h('button',{className:'btn btn-primary',disabled:busy},busy?'Saving…':'Save Review'))
        )
      ),

      showReport&&h('div',{className:'modal-backdrop',onClick:e=>{if(e.target===e.currentTarget)setShowReport(false)}},
        h('div',{className:'card modal',style:{width:'min(1500px,97vw)',maxHeight:'95vh',overflow:'auto'}},
          h('div',{className:'panel-head no-print'},
            h('div',null,h('h3',null,'Medication Safety Management Report'),h('small',null,`${formatDateIN(fromDate)} to ${formatDateIN(toDate)}`)),
            h('div',{className:'actions'},
              h('button',{type:'button',className:'btn btn-secondary',onClick:()=>setShowReport(false)},'← Back to Safety Centre'),
              h('button',{type:'button',className:'btn btn-secondary',onClick:()=>{setShowReport(false);onNavigate&&onNavigate(ROLE_HOME[profile.role]||'Dashboard')}},'⌂ Dashboard'),
              h('button',{type:'button',className:'btn btn-secondary',onClick:csvExport},'Export Excel / CSV'),
              h('button',{type:'button',className:'btn btn-primary',onClick:printCurrentReport},'Print / Save PDF'),
              h('button',{type:'button',className:'close',onClick:()=>setShowReport(false)},'×')
            )
          ),
          h('div',{id:'medication-safety-report'},
            h('h1',null,'Samara Care ERP'),
            h('h2',null,'Medication Safety Management Report'),
            h('p',null,`Period: ${formatDateIN(fromDate)} to ${formatDateIN(toDate)} · Prepared: ${formatDateTimeIN(new Date())} · Prepared by: ${formalName(profile)}`),
            h('div',{className:'grid stats'},[['Safety Score',`${safetyScore}%`],['Total Events',total],['Open Review',openCount],['Major / Critical',high],['Residents Affected',affectedPatients]].map(([label,value])=>h('div',{className:'card stat',key:label},h('span',null,label),h('strong',null,value)))),
            h('div',{className:'card panel'},h('h3',null,'AI-assisted executive summary'),h('p',null,aiSummary())),
            h('div',{className:'card panel'},h('h3',null,'Category analysis'),h('p',null,ERROR_TYPES.filter(t=>counts[t]).map(t=>`${t}: ${counts[t]}`).join(' · ')||'No events')),
            h('div',{className:'card panel'},h('h3',null,'Severity analysis'),h('p',null,SEVERITIES.filter(t=>severityCounts[t]).map(t=>`${t}: ${severityCounts[t]}`).join(' · ')||'No events')),
            reportTable
          )
        )
      )
    );
  }
  function FoodDiet({profile}){
    const [patients]=usePatients(),[rows,setRows]=React.useState([]),[form,setForm]=React.useState({patient_id:'',meal_type:'Breakfast',menu:'',consumption_status:'Consumed fully',remarks:''});async function load(){const {data}=await client.from('meal_records').select('*,patients(full_name,room_no,bed_no)').order('served_at',{ascending:false}).limit(100);setRows(data||[])}React.useEffect(()=>{load()},[]);
    async function save(e){e.preventDefault();const {error}=await client.from('meal_records').insert({...form,meal_date:new Date().toISOString().slice(0,10),served_at:new Date().toISOString(),recorded_by:profile.id});if(error)return alert(error.message);setForm({...form,menu:'',remarks:''});load()}
    return h(React.Fragment,null,h(Section,{title:'Food & Diet',subtitle:'Meal service, intake and feeding assistance'},h('form',{className:'modal-grid',onSubmit:save},patientSelect(patients,form.patient_id,v=>setForm({...form,patient_id:v})),miniSelect('Meal',form.meal_type,['Breakfast','Lunch','Evening snack','Dinner','Tube feed','Other'],v=>setForm({...form,meal_type:v})),miniInput('Menu / feed',form.menu,v=>setForm({...form,menu:v}),true),miniSelect('Consumption',form.consumption_status,['Consumed fully','Consumed partially','Refused','Vomited','Tube feed completed'],v=>setForm({...form,consumption_status:v})),miniInput('Remarks',form.remarks,v=>setForm({...form,remarks:v})),h('button',{className:'btn btn-primary'},'Save meal record'))),h(LogTable,{title:'Recent Meal Records',heads:['Patient','Meal','Menu','Consumption','Time'],rows:rows.map(r=>[r.patients?.full_name,r.meal_type,r.menu,r.consumption_status,fmt(r.served_at)])}))
  }

  function Physiotherapy({profile}){
    const canEnter=['Admin','Manager','Nurse','Caregiver'].includes(profile?.role);
    const [plans,setPlans]=React.useState([]);
    const [patients,setPatients]=React.useState([]);
    const [sessions,setSessions]=React.useState([]);
    const [loading,setLoading]=React.useState(true);
    const [message,setMessage]=React.useState('');
    const [entryPlan,setEntryPlan]=React.useState(null);
    const [saving,setSaving]=React.useState(false);
    const [toast,setToast]=React.useState(null);
    const toastTimer=React.useRef(null);
    const [form,setForm]=React.useState({
      session_date:todayISOIndia(),
      scheduled_time:'',
      status:'Completed',
      reason:'',
      notes:''
    });

    const timeOptions=Array.from({length:24},(_,hour)=>{
      const h12=hour%12||12;
      const suffix=hour<12?'AM':'PM';
      const value=`${String(hour).padStart(2,'0')}:00`;
      return {value,label:`${h12}:00 ${suffix}`};
    });

    function clockLabel(value){
      if(!value)return '—';
      const raw=String(value).slice(0,5);
      const [h,m]=raw.split(':').map(Number);
      if(Number.isNaN(h)||Number.isNaN(m))return value;
      return `${h%12||12}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}`;
    }

    function showToast(type,text){
      clearTimeout(toastTimer.current);
      setToast({type,text});
      toastTimer.current=setTimeout(()=>setToast(null),4500);
    }
    React.useEffect(()=>()=>clearTimeout(toastTimer.current),[]);

    async function load(){
      setLoading(true);setMessage('');
      const [plansResult,patientsResult,sessionsResult]=await Promise.all([
        client.from('physiotherapy_plans').select('*').order('created_at',{ascending:false}),
        client.from('patients').select('id,title,full_name,patient_id,room_no,bed_no,is_active').order('full_name'),
        client.from('physiotherapy_sessions').select('*').order('session_date',{ascending:false}).order('created_at',{ascending:false}).limit(300)
      ]);
      if(plansResult.error){
        setMessage(plansResult.error.message||'Unable to load physiotherapy plans.');
        setPlans([]);
      }else{
        setPlans((plansResult.data||[]).filter(row=>row.is_active!==false));
      }
      if(!patientsResult.error)setPatients(patientsResult.data||[]);
      if(!sessionsResult.error)setSessions(sessionsResult.data||[]);
      setLoading(false);
    }

    React.useEffect(()=>{
      load();
      const channel=client.channel('physiotherapy-live')
        .on('postgres_changes',{event:'*',schema:'public',table:'physiotherapy_plans'},load)
        .on('postgres_changes',{event:'*',schema:'public',table:'physiotherapy_sessions'},load)
        .subscribe();
      return()=>client.removeChannel(channel);
    },[]);

    const patientFor=id=>patients.find(p=>p.id===id)||{};
    const planFor=id=>plans.find(p=>p.id===id)||{};
    const patientLabel=id=>{
      const patient=patientFor(id);
      return patient.id
        ? `${formalName(patient)}${patient.patient_id?` · ${patient.patient_id}`:''}${patient.room_no?` · Room ${patient.room_no}${patient.bed_no?`-${patient.bed_no}`:''}`:''}`
        : 'Patient not linked';
    };

    function openEntry(plan){
      setEntryPlan(plan);
      setForm({
        session_date:todayISOIndia(),
        scheduled_time:String(plan.preferred_time||'').slice(0,5),
        status:'Completed',
        reason:'',
        notes:''
      });
    }

    async function saveSession(e){
      e.preventDefault();
      if(!entryPlan||saving)return;
      if(isFutureDateIndia(form.session_date)){
        showToast('error','Future physiotherapy session dates are not permitted.');
        return;
      }
      if(['Pending','Not Done'].includes(form.status)&&!form.reason.trim()){
        showToast('error',`Reason is mandatory when the status is ${form.status}.`);
        return;
      }
      setSaving(true);
      const {data:{user}}=await client.auth.getUser();
      const payload={
        order_id:entryPlan.id,
        patient_id:entryPlan.patient_id,
        session_date:form.session_date,
        scheduled_time:form.scheduled_time||entryPlan.preferred_time||null,
        status:form.status,
        session_at:form.status==='Completed'?new Date().toISOString():null,
        performed_by:user?.id||profile?.id,
        reason:form.reason||null,
        notes:form.notes||null,
        physiotherapist_name:entryPlan.physiotherapist_name||null,
        updated_at:new Date().toISOString()
      };
      const {data,error}=await client.from('physiotherapy_sessions')
        .upsert(payload,{onConflict:'order_id,session_date'})
        .select('id')
        .single();
      setSaving(false);
      if(error){
        showToast('error',error.message||'Unable to save physiotherapy session.');
        return;
      }
      showToast('success',`Physiotherapy session marked as ${form.status}.`);
      setEntryPlan(null);
      await load();
      writeAuditEvent('Physiotherapy Session Recorded','Physiotherapy',data?.id||entryPlan.id,{
        patient_id:entryPlan.patient_id,
        therapy:entryPlan.therapy_type,
        status:form.status,
        reason:form.reason||null
      },'Success');
    }

    const planRows=plans.map(plan=>[
      patientLabel(plan.patient_id),
      plan.therapy_type||plan.therapy||plan.exercise_name||'—',
      plan.physiotherapist_name||'—',
      plan.frequency||'—',
      clockLabel(plan.preferred_time||plan.session_time),
      plan.precautions||plan.special_instructions||'—',
      canEnter?h('button',{type:'button',className:'btn btn-primary',onClick:()=>openEntry(plan)},'Record Session'):h('span',{className:'small-note'},'View only')
    ]);

    const recentRows=sessions.map(session=>{
      const plan=planFor(session.order_id);
      return [
        formatDateIN(session.session_date),
        patientLabel(session.patient_id),
        plan.therapy_type||'—',
        session.physiotherapist_name||plan.physiotherapist_name||'—',
        clockLabel(session.scheduled_time||plan.preferred_time),
        session.status||'—',
        session.reason||session.notes||'—',
        fmt(session.updated_at||session.created_at)
      ];
    });

    return h(React.Fragment,null,
      message&&h('div',{className:'message error'},message),
      h(LogTable,{
        title:'Physiotherapy Plan',
        subtitle:'Therapy advised at discharge or during patient review',
        heads:['Patient','Therapy','Physiotherapist Name','Frequency','Preferred Time','Precautions','Action'],
        rows:planRows
      }),
      !loading&&!message&&!planRows.length&&h('div',{className:'card panel'},
        h('p',{className:'small-note'},'No active physiotherapy plan has been entered. Admin or Manager can add the plan from Patient Edit.')
      ),
      h(LogTable,{
        title:'Recent Physiotherapy Sessions',
        subtitle:'Completion, pending and not-done records entered by the care team',
        heads:['Date','Patient','Therapy','Physiotherapist','Scheduled Time','Status','Reason / Notes','Recorded'],
        rows:recentRows
      }),
      entryPlan&&h('div',{className:'modal-backdrop',onClick:e=>{if(e.target===e.currentTarget)setEntryPlan(null)}},
        h('form',{className:'card modal',onSubmit:saveSession},
          h('div',{className:'panel-head'},
            h('div',null,
              h('h3',null,'Record Physiotherapy Session'),
              h('small',null,`${patientLabel(entryPlan.patient_id)} · ${entryPlan.therapy_type||'Therapy'}`)
            ),
            h('button',{type:'button',className:'close',onClick:()=>setEntryPlan(null)},'×')
          ),
          h('div',{className:'modal-grid'},
            h('div',{className:'field'},h('label',null,'Session Date'),h('input',{
              type:'date',value:form.session_date,max:todayISOIndia(),
              onChange:e=>setForm({...form,session_date:e.target.value})
            })),
            h('div',{className:'field'},h('label',null,'Preferred / Scheduled Time'),h('select',{
              value:form.scheduled_time,onChange:e=>setForm({...form,scheduled_time:e.target.value})
            },h('option',{value:''},'Select time'),timeOptions.map(option=>h('option',{key:option.value,value:option.value},option.label)))),
            h('div',{className:'field'},h('label',null,'Status'),h('select',{
              value:form.status,onChange:e=>setForm({...form,status:e.target.value,reason:e.target.value==='Completed'?'':form.reason})
            },['Completed','Pending','Not Done'].map(x=>h('option',{key:x,value:x},x)))),
            h('div',{className:'field'},h('label',null,'Physiotherapist Name'),h('input',{
              value:entryPlan.physiotherapist_name||'',readOnly:true
            })),
            ['Pending','Not Done'].includes(form.status)&&h('div',{className:'field span-2'},h('label',null,'Reason (mandatory)'),h('textarea',{
              required:true,rows:3,value:form.reason,onChange:e=>setForm({...form,reason:e.target.value}),
              placeholder:form.status==='Pending'?'Example: Patient temporarily unavailable / session rescheduled':'Example: Patient refused / medically unfit / therapist unavailable'
            })),
            h('div',{className:'field span-2'},h('label',null,'Session Notes'),h('textarea',{
              rows:3,value:form.notes,onChange:e=>setForm({...form,notes:e.target.value}),
              placeholder:'Exercises completed, patient tolerance, pain, mobility response or instructions'
            }))
          ),
          h('div',{className:'actions'},
            h('button',{type:'button',className:'btn btn-secondary',onClick:()=>setEntryPlan(null)},'Cancel'),
            h('button',{className:'btn btn-primary',disabled:saving},saving?'Saving…':'Save Session')
          )
        )
      ),
      toast&&h('div',{className:`samara-toast ${toast.type}`,role:'status','aria-live':'polite'},
        h('span',{className:'samara-toast-icon','aria-hidden':'true'},toast.type==='success'?'✓':'!'),
        h('div',null,h('strong',null,toast.type==='success'?'Session saved':'Save failed'),h('span',null,toast.text)),
        h('button',{type:'button','aria-label':'Close notification',onClick:()=>setToast(null)},'×')
      )
    );
  }
  
  function SpecialNurseManagement({profile}){
    const canManage=['Admin','Manager'].includes(profile?.role);
    const canUpdate=['Admin','Manager','Nurse','Caregiver'].includes(profile?.role);
    const [assignments,setAssignments]=React.useState([]);
    const [patients,setPatients]=React.useState([]);
    const [employees,setEmployees]=React.useState([]);
    const [loading,setLoading]=React.useState(true);
    const [message,setMessage]=React.useState('');
    const [showForm,setShowForm]=React.useState(false);
    const [editing,setEditing]=React.useState(null);
    const [busy,setBusy]=React.useState(false);
    const [toast,setToast]=React.useState(null);
    const toastTimer=React.useRef(null);
    const emptyForm={
      patient_id:'',
      nurse_profile_id:'',
      nurse_name:'',
      nurse_source:'Our Employee',
      outsourced_company_name:'',
      outsourced_registration_number:'',
      outsourced_contact_person:'',
      outsourced_contact_number:'',
      outsourced_agreement_reference:'',
      assignment_type:'Dedicated Nurse',
      coverage_days:['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
      start_time:'07:00',
      end_time:'19:00',
      shift:'Day Shift',
      start_date:todayISOIndia(),
      end_date:'',
      duration_type:'Until further order',
      duration_value:'',
      responsibilities:'',
      special_instructions:'',
      emergency_contact:'',
      status:'Active',
      notes:''
    };
    const [form,setForm]=React.useState(emptyForm);

    function showToast(type,text){
      clearTimeout(toastTimer.current);
      setToast({type,text});
      toastTimer.current=setTimeout(()=>setToast(null),4500);
    }
    React.useEffect(()=>()=>clearTimeout(toastTimer.current),[]);

    async function load(){
      setLoading(true);setMessage('');
      const [a,p,e]=await Promise.all([
        client.from('special_nurse_assignments').select('*').order('created_at',{ascending:false}),
        client.from('patients').select('id,title,full_name,patient_id,room_no,bed_no,is_active').order('full_name'),
        client.from('profiles').select('id,auth_user_id,title,full_name,employee_id,role,is_active').order('full_name')
      ]);
      if(a.error){setMessage(a.error.message||'Unable to load Special Nurse assignments.');setAssignments([])}
      else setAssignments(a.data||[]);
      if(!p.error)setPatients(p.data||[]);
      if(!e.error)setEmployees((e.data||[]).filter(x=>x.is_active!==false&&['Nurse','Caregiver'].includes(x.role)));
      setLoading(false);
    }

    React.useEffect(()=>{
      load();
      const channel=client.channel('special-nurse-live')
        .on('postgres_changes',{event:'*',schema:'public',table:'special_nurse_assignments'},load)
        .subscribe();
      return()=>client.removeChannel(channel);
    },[]);

    const patientFor=id=>patients.find(p=>p.id===id)||{};
    const employeeFor=id=>employees.find(e=>e.id===id||e.auth_user_id===id)||{};
    const patientLabel=id=>{const p=patientFor(id);return p.id?`${formalName(p)} · ${p.patient_id||'—'} · Room ${p.room_no||'—'}${p.bed_no?`-${p.bed_no}`:''}`:'Patient not linked'};
    const nurseLabel=row=>{const e=employeeFor(row.nurse_profile_id);return e.id?`${formalName(e)} · ${e.role}`:(row.nurse_name||'Not assigned')};
    const clockLabel=value=>{
      if(!value)return '—';
      const [hour,minute]=String(value).slice(0,5).split(':').map(Number);
      return `${hour%12||12}:${String(minute||0).padStart(2,'0')} ${hour<12?'AM':'PM'}`;
    };
    const daysLabel=value=>Array.isArray(value)?value.join(', '):(value||'—');

    function openCreate(){
      setEditing(null);
      setForm({...emptyForm,start_date:todayISOIndia()});
      setShowForm(true);
    }
    function openEdit(row){
      setEditing(row);
      setForm({
        ...emptyForm,...row,
        nurse_source:row.nurse_source||'Our Employee',
        outsourced_company_name:row.outsourced_company_name||'',
        outsourced_registration_number:row.outsourced_registration_number||'',
        outsourced_contact_person:row.outsourced_contact_person||'',
        outsourced_contact_number:row.outsourced_contact_number||'',
        outsourced_agreement_reference:row.outsourced_agreement_reference||'',
        coverage_days:Array.isArray(row.coverage_days)?row.coverage_days:[],
        start_time:String(row.start_time||'07:00').slice(0,5),
        end_time:String(row.end_time||'19:00').slice(0,5),
        start_date:row.start_date||todayISOIndia(),
        end_date:row.end_date||''
      });
      setShowForm(true);
    }
    function toggleDay(day){
      setForm(current=>({...current,coverage_days:current.coverage_days.includes(day)?current.coverage_days.filter(x=>x!==day):[...current.coverage_days,day]}));
    }

    async function save(e){
      e.preventDefault();
      if(!canManage)return;
      if(!form.patient_id){showToast('error','Please select the assigned patient.');return}
      if(form.nurse_source==='Our Employee'&&!form.nurse_profile_id){showToast('error','Please select the registered Nurse or Caregiver assigned for special duty.');return}
      if(form.nurse_source==='Our Employee'){
        const selected=employeeFor(form.nurse_profile_id);
        if(!selected.id||!['Nurse','Caregiver'].includes(selected.role)){
          showToast('error','Only employees with the role Nurse or Caregiver can be assigned for Special Nurse duty.');
          return;
        }
      }
      if(form.nurse_source==='Outsourced'&&!form.nurse_name.trim()){showToast('error','Please enter the outsourced Special Nurse name.');return}
      if(form.nurse_source==='Outsourced'&&!form.outsourced_company_name.trim()){showToast('error','Please enter the outsourcing company or organisation name.');return}
      if(!form.coverage_days.length){showToast('error','Select at least one coverage day.');return}
      if(isFutureDateIndia(form.start_date)){showToast('error','Future assignment start dates are not permitted.');return}
      if(form.end_date&&form.end_date<form.start_date){showToast('error','End date cannot be earlier than the start date.');return}
      setBusy(true);
      const {data:{user}}=await client.auth.getUser();
      const selectedEmployee=employeeFor(form.nurse_profile_id);
      const payload={
        patient_id:form.patient_id,
        nurse_profile_id:form.nurse_source==='Our Employee'?(form.nurse_profile_id||null):null,
        nurse_name:form.nurse_source==='Our Employee'?(formalName(selectedEmployee)||form.nurse_name||null):(form.nurse_name||null),
        nurse_source:form.nurse_source,
        outsourced_company_name:form.nurse_source==='Outsourced'?(form.outsourced_company_name||null):null,
        outsourced_registration_number:form.nurse_source==='Outsourced'?(form.outsourced_registration_number||null):null,
        outsourced_contact_person:form.nurse_source==='Outsourced'?(form.outsourced_contact_person||null):null,
        outsourced_contact_number:form.nurse_source==='Outsourced'?(form.outsourced_contact_number||null):null,
        outsourced_agreement_reference:form.nurse_source==='Outsourced'?(form.outsourced_agreement_reference||null):null,
        assignment_type:form.assignment_type,
        coverage_days:form.coverage_days,
        start_time:form.start_time||null,
        end_time:form.end_time||null,
        shift:form.shift,
        start_date:form.start_date,
        end_date:form.end_date||null,
        duration_type:form.duration_type,
        duration_value:form.duration_value||null,
        responsibilities:form.responsibilities||null,
        special_instructions:form.special_instructions||null,
        emergency_contact:form.emergency_contact||null,
        status:form.status,
        notes:form.notes||null,
        assigned_by:user?.id||profile?.id,
        updated_at:new Date().toISOString()
      };
      const query=editing
        ?client.from('special_nurse_assignments').update(payload).eq('id',editing.id).select('id').single()
        :client.from('special_nurse_assignments').insert(payload).select('id').single();
      const {data,error}=await query;
      setBusy(false);
      if(error){showToast('error',error.message||'Unable to save Special Nurse assignment.');return}
      showToast('success',editing?'Special Nurse assignment updated successfully.':'Special Nurse assigned successfully.');
      setShowForm(false);await load();
      writeAuditEvent(editing?'Special Nurse Assignment Updated':'Special Nurse Assigned','Special Nurse',data?.id||editing?.id,{
        patient_id:form.patient_id,
        nurse_name:payload.nurse_name,
        nurse_source:payload.nurse_source,
        outsourcing_organisation:payload.outsourced_company_name,
        shift:form.shift,
        coverage_days:form.coverage_days,
        status:form.status
      },'Success');
    }

    async function updateStatus(row,status){
      if(!canUpdate)return;
      const {data:{user}}=await client.auth.getUser();
      const {error}=await client.from('special_nurse_assignments').update({
        status,
        last_status_updated_by:user?.id||profile?.id,
        last_status_updated_at:new Date().toISOString(),
        updated_at:new Date().toISOString()
      }).eq('id',row.id);
      if(error){showToast('error',error.message||'Unable to update assignment status.');return}
      showToast('success',`Assignment status changed to ${status}.`);
      await load();
    }

    const rows=assignments.map(row=>[
      patientLabel(row.patient_id),
      nurseLabel(row),
      row.nurse_source||'Our Employee',
      row.nurse_source==='Outsourced'?(row.outsourced_company_name||'—'):'Samara Care',
      row.assignment_type||'Special Nurse',
      daysLabel(row.coverage_days),
      `${clockLabel(row.start_time)} – ${clockLabel(row.end_time)}`,
      row.shift||'—',
      `${formatDateIN(row.start_date)}${row.end_date?` to ${formatDateIN(row.end_date)}`:''}`,
      row.duration_type+(row.duration_value?` · ${row.duration_value}`:''),
      row.responsibilities||row.special_instructions||'—',
      h('span',{className:`badge ${row.status==='Active'?'':'off'}`},row.status||'Active'),
      h('div',{className:'employee-actions'},
        canManage&&h('button',{type:'button',className:'btn btn-secondary',onClick:()=>openEdit(row)},'Edit'),
        canUpdate&&h('select',{value:row.status||'Active',onChange:e=>updateStatus(row,e.target.value)},['Active','On Duty','Off Duty','Leave','Completed','Cancelled'].map(x=>h('option',{key:x,value:x},x)))
      )
    ]);

    return h(React.Fragment,null,
      h(Section,{title:'Special Nurse Management',subtitle:'Dedicated nurse assignment, coverage, duration and responsibility tracking'},
        message&&h('div',{className:'message error'},message),
        h('div',{className:'panel-head'},
          h('div',null,h('p',{className:'small-note'},'All authorised users can view assignments. Admin and Manager can create/edit; Nurses and Caregivers can update duty status.')),
          canManage&&h('button',{type:'button',className:'btn btn-primary',onClick:openCreate},'Assign Special Nurse')
        )
      ),
      h(LogTable,{
        title:`Special Nurse Assignments (${rows.length})`,
        subtitle:'Current and historical dedicated nursing coverage',
        heads:['Assigned Patient','Special Nurse','Source','Company / Organisation','Assignment','Days','Time','Shift','Period','Duration','Responsibilities / Instructions','Status','Action'],
        rows
      }),
      !loading&&!message&&!rows.length&&h('div',{className:'card panel'},h('p',{className:'small-note'},'No Special Nurse assignment has been entered. Admin or Manager can create the first assignment.')),
      showForm&&h('div',{className:'modal-backdrop',onClick:e=>{if(e.target===e.currentTarget)setShowForm(false)}},
        h('form',{className:'card modal',style:{width:'min(1050px,96vw)',maxHeight:'92vh',overflow:'auto'},onSubmit:save},
          h('div',{className:'panel-head'},
            h('div',null,h('h3',null,editing?'Edit Special Nurse Assignment':'Assign Special Nurse'),h('small',null,'Patient-specific dedicated nursing coverage')),
            h('button',{type:'button',className:'close',onClick:()=>setShowForm(false)},'×')
          ),
          h('div',{className:'modal-grid'},
            h('div',{className:'field'},h('label',null,'Assigned Patient'),h('select',{required:true,value:form.patient_id,onChange:e=>setForm({...form,patient_id:e.target.value})},h('option',{value:''},'Select patient'),patients.filter(p=>p.is_active!==false).map(p=>h('option',{key:p.id,value:p.id},patientLabel(p.id))))),
            h('div',{className:'field'},h('label',null,'Special Nurse Source'),h('select',{
              value:form.nurse_source,
              onChange:e=>setForm({...form,nurse_source:e.target.value,nurse_profile_id:'',nurse_name:'',outsourced_company_name:'',outsourced_registration_number:'',outsourced_contact_person:'',outsourced_contact_number:'',outsourced_agreement_reference:''})
            },['Our Employee','Outsourced'].map(x=>h('option',{key:x,value:x},x)))),
            form.nurse_source==='Our Employee'
              ?h('div',{className:'field'},h('label',null,'Registered Nurse / Caregiver'),h('select',{required:true,value:form.nurse_profile_id,onChange:e=>{const emp=employeeFor(e.target.value);setForm({...form,nurse_profile_id:e.target.value,nurse_name:formalName(emp)||''})}},h('option',{value:''},'Select Nurse or Caregiver'),employees.map(emp=>h('option',{key:emp.id,value:emp.id},`${formalName(emp)}${emp.employee_id?` · ${emp.employee_id}`:''} · ${emp.role}`))))
              :h('div',{className:'field'},h('label',null,'Outsourced Special Nurse Name'),h('input',{required:true,value:form.nurse_name,onChange:e=>setForm({...form,nurse_name:e.target.value}),placeholder:'Name of outsourced nurse'})),
            form.nurse_source==='Outsourced'&&h('div',{className:'field'},h('label',null,'Company / Organisation Name'),h('input',{required:true,value:form.outsourced_company_name,onChange:e=>setForm({...form,outsourced_company_name:e.target.value}),placeholder:'Agency, hospital or service provider'})),
            form.nurse_source==='Outsourced'&&h('div',{className:'field'},h('label',null,'Nurse Registration Number (optional)'),h('input',{value:form.outsourced_registration_number,onChange:e=>setForm({...form,outsourced_registration_number:e.target.value}),placeholder:'Nursing council registration number'})),
            form.nurse_source==='Outsourced'&&h('div',{className:'field'},h('label',null,'Organisation Contact Person'),h('input',{value:form.outsourced_contact_person,onChange:e=>setForm({...form,outsourced_contact_person:e.target.value}),placeholder:'Coordinator / supervisor name'})),
            form.nurse_source==='Outsourced'&&h('div',{className:'field'},h('label',null,'Organisation Contact Number'),h('input',{value:form.outsourced_contact_number,onChange:e=>setForm({...form,outsourced_contact_number:e.target.value}),placeholder:'Mobile / office number'})),
            form.nurse_source==='Outsourced'&&h('div',{className:'field'},h('label',null,'Agreement / Work Order Reference'),h('input',{value:form.outsourced_agreement_reference,onChange:e=>setForm({...form,outsourced_agreement_reference:e.target.value}),placeholder:'Optional agreement, invoice or work-order number'})),
            h('div',{className:'field'},h('label',null,'Assignment Type'),h('select',{value:form.assignment_type,onChange:e=>setForm({...form,assignment_type:e.target.value})},['Dedicated Nurse','Special Nurse','One-to-One Caregiver','Night Attendant','Procedure Support','Temporary Relief'].map(x=>h('option',{key:x,value:x},x)))),
            h('div',{className:'field span-2'},h('label',null,'Coverage Days'),h('div',{className:'check-grid'},['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day=>h('label',{className:'check-card',key:day},h('input',{type:'checkbox',checked:form.coverage_days.includes(day),onChange:()=>toggleDay(day)}),h('span',null,day))))),
            h('div',{className:'field'},h('label',null,'Start Time'),h('input',{type:'time',value:form.start_time,onChange:e=>setForm({...form,start_time:e.target.value})})),
            h('div',{className:'field'},h('label',null,'End Time'),h('input',{type:'time',value:form.end_time,onChange:e=>setForm({...form,end_time:e.target.value})})),
            h('div',{className:'field'},h('label',null,'Shift'),h('select',{value:form.shift,onChange:e=>setForm({...form,shift:e.target.value})},['Day Shift','Night Shift','Both Shifts','Custom Hours'].map(x=>h('option',{key:x,value:x},x)))),
            h('div',{className:'field'},h('label',null,'Status'),h('select',{value:form.status,onChange:e=>setForm({...form,status:e.target.value})},['Active','On Duty','Off Duty','Leave','Completed','Cancelled'].map(x=>h('option',{key:x,value:x},x)))),
            h('div',{className:'field'},h('label',null,'Start Date'),h('input',{type:'date',max:todayISOIndia(),value:form.start_date,onChange:e=>setForm({...form,start_date:e.target.value})})),
            h('div',{className:'field'},h('label',null,'End Date'),h('input',{type:'date',min:form.start_date||undefined,value:form.end_date,onChange:e=>setForm({...form,end_date:e.target.value})})),
            h('div',{className:'field'},h('label',null,'Duration'),h('select',{value:form.duration_type,onChange:e=>setForm({...form,duration_type:e.target.value})},['Single Shift','1 Day','3 Days','5 Days','7 Days','15 Days','1 Month','Until further order','Custom'].map(x=>h('option',{key:x,value:x},x)))),
            h('div',{className:'field'},h('label',null,'Custom Duration / Details'),h('input',{value:form.duration_value,onChange:e=>setForm({...form,duration_value:e.target.value}),placeholder:'Example: 6 weeks / 12-hour duty'})),
            h('div',{className:'field'},h('label',null,'Emergency Contact'),h('input',{value:form.emergency_contact,onChange:e=>setForm({...form,emergency_contact:e.target.value}),placeholder:'Contact number'})),
            h('div',{className:'field span-2'},h('label',null,'Responsibilities'),h('textarea',{rows:3,value:form.responsibilities,onChange:e=>setForm({...form,responsibilities:e.target.value}),placeholder:'Medication supervision, mobility support, fall prevention, feeding, observation, escort, etc.'})),
            h('div',{className:'field span-2'},h('label',null,'Special Instructions / Precautions'),h('textarea',{rows:3,value:form.special_instructions,onChange:e=>setForm({...form,special_instructions:e.target.value}),placeholder:'Clinical precautions, escalation instructions, doctor advice or family requirements'})),
            h('div',{className:'field span-2'},h('label',null,'Other Notes'),h('textarea',{rows:2,value:form.notes,onChange:e=>setForm({...form,notes:e.target.value})}))
          ),
          h('div',{className:'actions'},h('button',{type:'button',className:'btn btn-secondary',onClick:()=>setShowForm(false)},'Cancel'),h('button',{className:'btn btn-primary',disabled:busy},busy?'Saving…':editing?'Update Assignment':'Save Assignment'))
        )
      ),
      toast&&h('div',{className:`samara-toast ${toast.type}`,role:'status','aria-live':'polite'},
        h('span',{className:'samara-toast-icon','aria-hidden':'true'},toast.type==='success'?'✓':'!'),
        h('div',null,h('strong',null,toast.type==='success'?'Special Nurse updated':'Update failed'),h('span',null,toast.text)),
        h('button',{type:'button','aria-label':'Close notification',onClick:()=>setToast(null)},'×')
      )
    );
  }

function ShiftHandover({profile}){
    const [rows,setRows]=React.useState([]),[form,setForm]=React.useState({shift:currentShift(),patient_summary:'',pending_tasks:'',special_instructions:'',priority:'Routine'});async function load(){const {data}=await client.from('shift_handovers').select('*,profiles!shift_handovers_submitted_by_fkey(full_name)').order('created_at',{ascending:false}).limit(50);setRows(data||[])}React.useEffect(()=>{load()},[]);
    async function save(e){e.preventDefault();const {error}=await client.from('shift_handovers').insert({...form,handover_date:new Date().toISOString().slice(0,10),submitted_by:profile.id});if(error)return alert(error.message);setForm({...form,patient_summary:'',pending_tasks:'',special_instructions:''});load()}
    return h(React.Fragment,null,h(Section,{title:'Shift Handover',subtitle:'Patient status, pending work and priority instructions'},h('form',{className:'form-stack',onSubmit:save},miniSelect('Outgoing shift',form.shift,['Day Shift (7 AM–7 PM)','Night Shift (7 PM–7 AM)'],v=>setForm({...form,shift:v})),textareaSimple('Patient summary',form.patient_summary,v=>setForm({...form,patient_summary:v})),textareaSimple('Pending tasks',form.pending_tasks,v=>setForm({...form,pending_tasks:v})),textareaSimple('Special instructions',form.special_instructions,v=>setForm({...form,special_instructions:v})),miniSelect('Priority',form.priority,['Routine','Important','Critical'],v=>setForm({...form,priority:v})),h('button',{className:'btn btn-primary'},'Submit handover'))),h(LogTable,{title:'Recent Handovers',heads:['Date','Shift','Priority','Summary','Pending','Submitted by'],rows:rows.map(r=>[r.handover_date,r.shift,r.priority,r.patient_summary,r.pending_tasks,r.profiles?.full_name])}))
  }

  function Incidents({profile}){
    const [patients]=usePatients(),[rows,setRows]=React.useState([]),[form,setForm]=React.useState({patient_id:'',incident_type:'Fall',description:'',immediate_action:'',severity:'Low'});async function load(){const {data}=await client.from('incidents').select('*,patients(full_name),profiles!incidents_reported_by_fkey(full_name)').order('incident_at',{ascending:false}).limit(100);setRows(data||[])}React.useEffect(()=>{load()},[]);
    async function save(e){e.preventDefault();const {error}=await client.from('incidents').insert({...form,incident_at:new Date().toISOString(),reported_by:profile.id,status:'Open'});if(error)return alert(error.message);setForm({...form,description:'',immediate_action:''});load()}
    return h(React.Fragment,null,h(Section,{title:'Incident & Fall Register',subtitle:'Report, review and close safety events'},h('form',{className:'modal-grid',onSubmit:save},patientSelect(patients,form.patient_id,v=>setForm({...form,patient_id:v})),miniSelect('Incident type',form.incident_type,['Fall','Medicine error','Injury','Behaviour','Food issue','Equipment failure','Hospital transfer','Other'],v=>setForm({...form,incident_type:v})),miniSelect('Severity',form.severity,['Low','Moderate','High','Critical'],v=>setForm({...form,severity:v})),miniInput('Description',form.description,v=>setForm({...form,description:v}),true),miniInput('Immediate action',form.immediate_action,v=>setForm({...form,immediate_action:v}),true),h('button',{className:'btn btn-primary'},'Report incident'))),h(LogTable,{title:'Incident Register',heads:['Patient','Type','Severity','Description','Action','Status','Time'],rows:rows.map(r=>[r.patients?.full_name,r.incident_type,r.severity,r.description,r.immediate_action,r.status,fmt(r.incident_at)])}))
  }

  function Documents({profile}){
    const [patients]=usePatients(),[rows,setRows]=React.useState([]),[form,setForm]=React.useState({patient_id:'',document_type:'Lab Report',report_date:'',hospital_laboratory:'',doctor_name:'',remarks:''}),[files,setFiles]=React.useState([]);
    async function load(){const {data}=await client.from('patient_documents').select('*,patients(full_name)').order('created_at',{ascending:false});setRows(data||[])}React.useEffect(()=>{load()},[]);
    async function save(e){e.preventDefault();if(!files.length)return alert('Select or capture at least one file.');for(const file of files){const safe=String(file.name||'document').replace(/[^a-zA-Z0-9._-]/g,'_');const path=`${form.patient_id}/${Date.now()}-${Math.random().toString(36).slice(2,8)}-${safe}`;const {error:up}=await client.storage.from('patient-documents').upload(path,file,{contentType:file.type||undefined});if(up)return alert(up.message);const {error}=await client.from('patient_documents').insert({...form,document_name:file.name,storage_path:path,mime_type:file.type||null,file_size:file.size||null,uploaded_by:profile.id,is_verified:true});if(error)return alert(error.message)}setFiles([]);setForm({...form,remarks:''});load()}
    async function openDoc(r){const {data,error}=await client.storage.from('patient-documents').createSignedUrl(r.storage_path,180);if(error)return alert(error.message);window.open(data.signedUrl,'_blank','noopener')}
    return h(React.Fragment,null,h(Section,{title:'Patient Documents',subtitle:'Identity proof, discharge, prescription, lab, scan and test reports'},h('form',{className:'modal-grid',onSubmit:save},patientSelect(patients,form.patient_id,v=>setForm({...form,patient_id:v})),miniSelect('Document type',form.document_type,['Identity Proof','Discharge Summary','Current Prescription','Previous Prescription','Lab Report','X-ray','CT Scan','MRI','Ultrasound','ECG','Echo','Operative Note','Physiotherapy Advice','Wound Photograph','Insurance','Consent','Other'],v=>setForm({...form,document_type:v})),miniInput('Report date',form.report_date,v=>setForm({...form,report_date:v}),false,'date'),miniInput('Hospital / Laboratory',form.hospital_laboratory,v=>setForm({...form,hospital_laboratory:v})),miniInput('Doctor',form.doctor_name,v=>setForm({...form,doctor_name:v})),miniInput('Remarks',form.remarks,v=>setForm({...form,remarks:v})),fileInput('Upload / Camera Capture',files,setFiles,'image/*,.pdf',true),h('button',{className:'btn btn-primary'},'Upload Document'))),h(LogTable,{title:'Medical Document Register',heads:['Patient','Type','Date','Hospital/Lab','Name','Action'],rows:rows.map(r=>[r.patients?.full_name,r.document_type,formatDateIN(r.report_date),r.hospital_laboratory||'—',r.document_name,h('button',{className:'btn btn-secondary',onClick:()=>openDoc(r)},'Open')])}))
  }

  
  function BillsCharges({profile}){
    const canRaise=['Admin','Manager','Nurse','Accounts'].includes(profile?.role);
    const canFinalise=['Admin','Manager','Accounts'].includes(profile?.role);
    const [patients]=usePatients();
    const [rows,setRows]=React.useState([]);
    const [loading,setLoading]=React.useState(true);
    const [message,setMessage]=React.useState('');
    const [show,setShow]=React.useState(false);
    const [editing,setEditing]=React.useState(null);
    const [busy,setBusy]=React.useState(false);
    const [toast,setToast]=React.useState(null);
    const toastTimer=React.useRef(null);
    const initial={
      patient_id:'',
      charge_date:todayISOIndia(),
      category:'Doctor Visit',
      service_provider:'',
      description:'',
      quantity:'1',
      unit_cost:'',
      estimated_amount:'',
      bill_available:false,
      bill_number:'',
      bill_date:'',
      bill_reference:'',
      requested_amount:'',
      final_amount:'',
      urgency:'Routine',
      requested_for_date:todayISOIndia(),
      remarks:'',
      status:'Raised'
    };
    const [form,setForm]=React.useState(initial);

    function showToast(type,text){
      clearTimeout(toastTimer.current);
      setToast({type,text});
      toastTimer.current=setTimeout(()=>setToast(null),5000);
    }
    React.useEffect(()=>()=>clearTimeout(toastTimer.current),[]);

    async function load(){
      setLoading(true);setMessage('');
      const {data,error}=await client.from('bill_charge_requests').select('*').order('created_at',{ascending:false}).limit(500);
      if(error){setMessage(error.message||'Unable to load bills and charges.');setRows([])}
      else setRows(data||[]);
      setLoading(false);
    }
    React.useEffect(()=>{
      load();
      const ch=client.channel('bill-charge-live')
        .on('postgres_changes',{event:'*',schema:'public',table:'bill_charge_requests'},load)
        .subscribe();
      return()=>client.removeChannel(ch);
    },[]);

    const patientFor=id=>patients.find(p=>p.id===id)||{};
    const patientLabel=id=>{
      const p=patientFor(id);
      return p.id?`${formalName(p)} · ${p.patient_id||'—'}${p.room_no?` · Room ${p.room_no}${p.bed_no?`-${p.bed_no}`:''}`:''}`:'Patient not linked';
    };
    const currency=value=>value!==null&&value!==undefined&&value!==''?`₹${Number(value||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`:'—';

    function openNew(){
      setEditing(null);
      setForm({...initial,charge_date:todayISOIndia(),requested_for_date:todayISOIndia()});
      setShow(true);
    }
    function openEdit(row){
      setEditing(row);
      setForm({...initial,...row,charge_date:row.charge_date||todayISOIndia(),requested_for_date:row.requested_for_date||todayISOIndia(),bill_date:row.bill_date||''});
      setShow(true);
    }

    async function save(e){
      e.preventDefault();
      if(!canRaise)return;
      if(!form.patient_id){showToast('error','Please select the patient.');return}
      if(isFutureDateIndia(form.charge_date)||isFutureDateIndia(form.bill_date)){showToast('error','Future bill or charge dates are not permitted.');return}
      if(!form.description.trim()){showToast('error','Please describe the service, item or expense.');return}
      if(form.bill_available&&!form.bill_number.trim()&&!form.bill_reference.trim()){showToast('error','Enter the bill number or bill reference when a bill is available.');return}
      if(profile.role==='Nurse'&&form.bill_available&&!Number(form.requested_amount||form.estimated_amount||0)){showToast('error','Enter the bill amount or estimated amount.');return}
      setBusy(true);
      const {data:{user}}=await client.auth.getUser();
      const qty=Math.max(1,Number(form.quantity||1));
      const calculated=Number(form.unit_cost||0)*qty;
      const requested=Number(form.requested_amount||form.estimated_amount||calculated||0);
      const payload={
        patient_id:form.patient_id,
        charge_date:form.charge_date,
        category:form.category,
        service_provider:form.service_provider||null,
        description:form.description.trim(),
        quantity:qty,
        unit_cost:form.unit_cost===''?null:Number(form.unit_cost),
        estimated_amount:form.estimated_amount===''?(calculated||null):Number(form.estimated_amount),
        bill_available:!!form.bill_available,
        bill_number:form.bill_available?(form.bill_number||null):null,
        bill_date:form.bill_available?(form.bill_date||null):null,
        bill_reference:form.bill_available?(form.bill_reference||null):null,
        requested_amount:requested||null,
        final_amount:canFinalise&&form.final_amount!==''?Number(form.final_amount):null,
        urgency:form.urgency,
        requested_for_date:form.requested_for_date,
        remarks:form.remarks||null,
        status:editing?.status||'Raised',
        raised_by:editing?.raised_by||user?.id||profile?.id,
        updated_at:new Date().toISOString()
      };
      let result=editing
        ?await client.from('bill_charge_requests').update(payload).eq('id',editing.id).select('id').single()
        :await client.from('bill_charge_requests').insert(payload).select('id').single();
      setBusy(false);
      if(result.error){showToast('error',result.error.message||'Unable to save bill/charge request.');return}
      showToast('success',editing?'Bill/charge request updated successfully.':'Bill/charge request raised successfully.');
      setShow(false);await load();
      writeAuditEvent(editing?'Bill/Charge Request Updated':'Bill/Charge Request Raised','Bills & Charges',result.data?.id,{
        patient_id:form.patient_id,category:form.category,requested_amount:requested||null,bill_available:form.bill_available
      },'Success');
    }

    async function finalise(row){
      if(!canFinalise)return;
      const amount=Number(row.final_amount||row.requested_amount||row.estimated_amount||0);
      if(!amount){showToast('error','Enter the final fee/charge before approval.');openEdit(row);return}
      if(!confirm(`Approve ${currency(amount)} for ${patientLabel(row.patient_id)} and post it to the Patient Ledger?`))return;
      setBusy(true);
      const {data,error}=await client.rpc('approve_bill_charge_request',{p_request_id:row.id,p_final_amount:amount});
      setBusy(false);
      if(error){showToast('error',error.message||'Unable to approve and post the charge.');return}
      showToast('success','Charge approved and posted to the Patient Ledger.');
      await load();
      writeAuditEvent('Bill/Charge Approved','Bills & Charges',row.id,{patient_id:row.patient_id,final_amount:amount,ledger_posted:true},'Success');
    }

    async function reject(row){
      if(!canFinalise)return;
      const reason=prompt('Reason for rejecting/cancelling this charge request:');
      if(!reason)return;
      const {error}=await client.from('bill_charge_requests').update({status:'Rejected',approval_remarks:reason,updated_at:new Date().toISOString()}).eq('id',row.id);
      if(error){showToast('error',error.message);return}
      showToast('success','Charge request rejected.');await load();
    }

    const tableRows=rows.map(row=>[
      patientLabel(row.patient_id),
      formatDateIN(row.charge_date),
      row.category||'—',
      row.description||'—',
      row.service_provider||'—',
      row.bill_available?`Yes${row.bill_number?` · ${row.bill_number}`:''}`:'No',
      currency(row.requested_amount||row.estimated_amount),
      currency(row.final_amount),
      row.urgency||'Routine',
      h('span',{className:`badge ${['Approved','Posted'].includes(row.status)?'':'off'}`},row.status||'Raised'),
      h('div',{className:'employee-actions'},
        (canFinalise||row.status==='Raised')&&row.status!=='Posted'&&row.status!=='Rejected'&&h('button',{className:'btn btn-secondary',onClick:()=>openEdit(row)},canFinalise?'Review / Enter Fee':'Edit'),
        canFinalise&&!['Posted','Rejected'].includes(row.status)&&h('button',{className:'btn btn-primary',disabled:busy,onClick:()=>finalise(row)},'Approve & Post'),
        canFinalise&&!['Posted','Rejected'].includes(row.status)&&h('button',{className:'btn btn-danger',onClick:()=>reject(row)},'Reject')
      )
    ]);

    return h(React.Fragment,null,
      h(Section,{title:'Bills & Charges',subtitle:'Clinical staff raise service/expense requests; Accounts or Manager verifies fees and posts approved charges'},
        message&&h('div',{className:'message error'},message),
        h('div',{className:'panel-head'},
          h('p',{className:'small-note'},'Nurses may raise Doctor Visit, Medicines, Physiotherapy, Additional Food and other charges. When the bill or fee is unavailable, Accounts/Manager enters the final amount before posting.'),
          canRaise&&h('button',{className:'btn btn-primary',onClick:openNew},'Raise Bill / Charge')
        )
      ),
      h(LogTable,{
        title:`Bill & Charge Requests (${tableRows.length})`,
        subtitle:'Approved charges are automatically transferred to Billing & Payments',
        heads:['Patient','Date','Category','Description','Provider','Bill Available','Requested / Estimate','Final Charge','Urgency','Status','Action'],
        rows:tableRows
      }),
      !loading&&!message&&!tableRows.length&&h('div',{className:'card panel'},h('p',{className:'small-note'},'No bill or charge request has been raised.')),
      show&&h('div',{className:'modal-backdrop',onClick:e=>{if(e.target===e.currentTarget)setShow(false)}},
        h('form',{className:'card modal',style:{width:'min(1050px,96vw)',maxHeight:'92vh',overflow:'auto'},onSubmit:save},
          h('div',{className:'panel-head'},
            h('div',null,h('h3',null,editing?'Review Bill / Charge':'Raise Bill / Charge'),h('small',null,'Patient-specific additional service or expense')),
            h('button',{type:'button',className:'close',onClick:()=>setShow(false)},'×')
          ),
          h('div',{className:'modal-grid'},
            h('div',{className:'field'},h('label',null,'Patient'),h('select',{required:true,value:form.patient_id,disabled:!!editing,onChange:e=>setForm({...form,patient_id:e.target.value})},h('option',{value:''},'Select patient'),patients.filter(p=>p.is_active!==false).map(p=>h('option',{key:p.id,value:p.id},patientLabel(p.id))))),
            h('div',{className:'field'},h('label',null,'Charge / Service Date'),h('input',{type:'date',max:todayISOIndia(),value:form.charge_date,onChange:e=>setForm({...form,charge_date:e.target.value})})),
            h('div',{className:'field'},h('label',null,'Category'),h('select',{value:form.category,onChange:e=>setForm({...form,category:e.target.value})},['Doctor Visit','Medicines','Physiotherapy','Additional Food','Diagnostic Test','Consumables','Medical Equipment','Ambulance / Transport','Special Nurse','Procedure / Dressing','Other'].map(x=>h('option',{key:x,value:x},x)))),
            h('div',{className:'field'},h('label',null,'Service Provider / Vendor'),h('input',{value:form.service_provider,onChange:e=>setForm({...form,service_provider:e.target.value}),placeholder:'Doctor, pharmacy, therapist, lab, vendor'})),
            h('div',{className:'field span-2'},h('label',null,'Description / Query'),h('textarea',{required:true,rows:3,value:form.description,onChange:e=>setForm({...form,description:e.target.value}),placeholder:'Example: Doctor visit consultation on request / medicine purchased / extra protein diet'})),
            h('div',{className:'field'},h('label',null,'Quantity'),h('input',{type:'number',min:'1',step:'1',value:form.quantity,onChange:e=>setForm({...form,quantity:e.target.value})})),
            h('div',{className:'field'},h('label',null,'Unit Cost (if known)'),h('input',{type:'number',min:'0',step:'0.01',value:form.unit_cost,onChange:e=>setForm({...form,unit_cost:e.target.value})})),
            h('div',{className:'field'},h('label',null,'Estimated Amount'),h('input',{type:'number',min:'0',step:'0.01',value:form.estimated_amount,onChange:e=>setForm({...form,estimated_amount:e.target.value})})),
            h('div',{className:'field'},h('label',null,'Requested / Bill Amount'),h('input',{type:'number',min:'0',step:'0.01',value:form.requested_amount,onChange:e=>setForm({...form,requested_amount:e.target.value})})),
            h('label',{className:'check-card'},h('input',{type:'checkbox',checked:!!form.bill_available,onChange:e=>setForm({...form,bill_available:e.target.checked})}),h('span',null,'Bill / Receipt is available')),
            h('div',{className:'field'},h('label',null,'Urgency'),h('select',{value:form.urgency,onChange:e=>setForm({...form,urgency:e.target.value})},['Routine','Urgent','Immediate'].map(x=>h('option',{key:x,value:x},x)))),
            form.bill_available&&h('div',{className:'field'},h('label',null,'Bill Number'),h('input',{value:form.bill_number,onChange:e=>setForm({...form,bill_number:e.target.value})})),
            form.bill_available&&h('div',{className:'field'},h('label',null,'Bill Date'),h('input',{type:'date',max:todayISOIndia(),value:form.bill_date,onChange:e=>setForm({...form,bill_date:e.target.value})})),
            form.bill_available&&h('div',{className:'field span-2'},h('label',null,'Bill / Receipt Reference'),h('input',{value:form.bill_reference,onChange:e=>setForm({...form,bill_reference:e.target.value}),placeholder:'Invoice reference, receipt details or document location'})),
            canFinalise&&h('div',{className:'field'},h('label',null,'Final Approved Fee / Charge'),h('input',{type:'number',min:'0',step:'0.01',value:form.final_amount,onChange:e=>setForm({...form,final_amount:e.target.value}),placeholder:'Entered by Accounts / Manager'})),
            h('div',{className:'field'},h('label',null,'Service Required On'),h('input',{type:'date',value:form.requested_for_date,onChange:e=>setForm({...form,requested_for_date:e.target.value})})),
            h('div',{className:'field span-2'},h('label',null,'Remarks'),h('textarea',{rows:2,value:form.remarks,onChange:e=>setForm({...form,remarks:e.target.value})}))
          ),
          h('div',{className:'actions'},h('button',{type:'button',className:'btn btn-secondary',onClick:()=>setShow(false)},'Cancel'),h('button',{className:'btn btn-primary',disabled:busy},busy?'Saving…':editing?'Save Review':'Raise Request'))
        )
      ),
      toast&&h('div',{className:`samara-toast ${toast.type}`,role:'status','aria-live':'polite'},
        h('span',{className:'samara-toast-icon'},toast.type==='success'?'✓':'!'),
        h('div',null,h('strong',null,toast.type==='success'?'Bills & Charges updated':'Update failed'),h('span',null,toast.text)),
        h('button',{type:'button',onClick:()=>setToast(null)},'×')
      )
    );
  }

function BillingPayments({profile}){
    const [patients]=usePatients(),[rows,setRows]=React.useState([]),[form,setForm]=React.useState({patient_id:'',transaction_type:'Charge',category:'Room Charges',amount:'',description:'',payment_mode:'Cash'});async function load(){const {data}=await client.from('billing_transactions').select('*,patients(full_name)').order('transaction_date',{ascending:false}).limit(200);setRows(data||[])}React.useEffect(()=>{load()},[]);
    async function save(e){e.preventDefault();const {error}=await client.from('billing_transactions').insert({...form,amount:Number(form.amount),transaction_date:new Date().toISOString(),entered_by:profile.id});if(error)return alert(error.message);setForm({...form,amount:'',description:''});load()}
    const totals=rows.reduce((a,r)=>{a[r.transaction_type]=(a[r.transaction_type]||0)+Number(r.amount||0);return a},{Charge:0,Payment:0,Discount:0,Refund:0});const due=totals.Charge-totals.Payment-totals.Discount+totals.Refund;
    return h(React.Fragment,null,h('div',{className:'grid stats'},[['Charges',totals.Charge],['Payments',totals.Payment],['Discounts',totals.Discount],['Outstanding',due]].map(([a,b])=>h('div',{className:'card stat',key:a},h('span',null,a),h('strong',null,`₹${b.toLocaleString('en-IN')}`)))),h(Section,{title:'Billing & Payment Entry',subtitle:'Charges, receipts, discounts and refunds'},h('form',{className:'modal-grid',onSubmit:save},patientSelect(patients,form.patient_id,v=>setForm({...form,patient_id:v})),miniSelect('Transaction',form.transaction_type,['Charge','Payment','Discount','Refund'],v=>setForm({...form,transaction_type:v})),miniSelect('Category',form.category,['Admission Fee','Room Charges','Nursing Charges','Food Charges','Medicine Charges','Physiotherapy','Consumables','Doctor Visit','Equipment','Other'],v=>setForm({...form,category:v})),miniInput('Amount',form.amount,v=>setForm({...form,amount:v}),true,'number'),miniSelect('Payment mode',form.payment_mode,['Cash','UPI','Bank transfer','Card','Cheque','Not applicable'],v=>setForm({...form,payment_mode:v})),miniInput('Description / reference',form.description,v=>setForm({...form,description:v})),h('button',{className:'btn btn-primary'},'Save transaction'))),h(LogTable,{title:'Patient Ledger',heads:['Patient','Type','Category','Amount','Mode','Description','Date'],rows:rows.map(r=>[r.patients?.full_name,r.transaction_type,r.category,`₹${Number(r.amount).toLocaleString('en-IN')}`,r.payment_mode,r.description||'—',fmt(r.transaction_date)])}))
  }

  function RecoveryTimeline({profile}){
    const [patients]=usePatients(),[rows,setRows]=React.useState([]),[patient,setPatient]=React.useState(''),[event,setEvent]=React.useState('Walking with support'),[note,setNote]=React.useState('');async function load(){const {data}=await client.from('recovery_events').select('*,patients(full_name)').order('event_at',{ascending:false}).limit(100);setRows(data||[])}React.useEffect(()=>{load()},[]);async function save(e){e.preventDefault();const {error}=await client.from('recovery_events').insert({patient_id:patient,event_type:event,note,recorded_by:profile.id});if(error)return alert(error.message);setNote('');load()}
    return h(React.Fragment,null,h(Section,{title:'Recovery Progress Timeline',subtitle:'Track improvement from hospital discharge to return home'},h('form',{className:'modal-grid',onSubmit:save},patientSelect(patients,patient,setPatient),miniSelect('Milestone',event,['Admitted after hospital discharge','Pain reduced','Walking with support','Independent walking','Feeding improved','Restroom independence','Medicine reduced','Wound improved','Physiotherapy goal achieved','Ready for discharge','Other'],setEvent),miniInput('Progress note',note,setNote,true),h('button',{className:'btn btn-primary'},'Add milestone'))),h(LogTable,{title:'Recovery Events',heads:['Patient','Milestone','Note','Date'],rows:rows.map(r=>[r.patients?.full_name,r.event_type,r.note,fmt(r.event_at)])}))
  }


  function IntelligentReports({profile}){
    const today=new Date().toISOString().slice(0,10);
    const [patients,setPatients]=React.useState([]);
    const [mode,setMode]=React.useState('Patient-wise');
    const [patientId,setPatientId]=React.useState('');
    const [reportDate,setReportDate]=React.useState(today);
    const [busy,setBusy]=React.useState(false);
    const [message,setMessage]=React.useState('');
    const [report,setReport]=React.useState(null);
    const [shareOpen,setShareOpen]=React.useState(false);
    const [shareRecipient,setShareRecipient]=React.useState('Relative');
    const [shareType,setShareType]=React.useState('Quick Health Update');
    const [shareLanguage,setShareLanguage]=React.useState('English');
    const [communicationRows,setCommunicationRows]=React.useState([]);
    const [shareBusy,setShareBusy]=React.useState(false);

    React.useEffect(()=>{
      client.from('patients').select('*').order('full_name').then(({data,error})=>{
        if(error)setMessage(error.message);else setPatients(data||[]);
      });
    },[]);

    async function loadCommunicationHistory(){
      const {data,error}=await client.from('patient_communications').select('*').order('created_at',{ascending:false}).limit(100);
      if(!error)setCommunicationRows(data||[]);
    }
    React.useEffect(()=>{loadCommunicationHistory()},[]);

    const dateOnly=value=>{
      if(!value)return '';
      const d=new Date(value);
      if(Number.isNaN(d.getTime()))return String(value).slice(0,10);
      return d.toISOString().slice(0,10);
    };
    const eventDate=(row,fields)=>{for(const f of fields){if(row&&row[f])return dateOnly(row[f]);}return '';};
    const patientName=id=>{const row=patients.find(p=>p.id===id);return row?formalName(row):'Unknown patient';};
    const money=value=>`₹${Number(value||0).toLocaleString('en-IN')}`;
    const safeRows=result=>result?.data||[];
    const byPatient=(rows,id)=>rows.filter(r=>r.patient_id===id);
    const byDay=(rows,date,fields)=>rows.filter(r=>eventDate(r,fields)===date);
    const latest=(rows,fields)=>[...rows].sort((a,b)=>new Date(eventDate(b,fields)||0)-new Date(eventDate(a,fields)||0))[0]||null;
    const text=value=>String(value||'').trim();
    const sentence=value=>{const v=text(value);return v?v.replace(/[.\s]+$/,'')+'.':'';};
    const dayStart=value=>{const d=value?new Date(value):null;if(!d||Number.isNaN(d.getTime()))return null;return new Date(d.getFullYear(),d.getMonth(),d.getDate());};
    const lengthOfStay=(patient,asOn)=>{
      const start=dayStart(patient?.admission_date);
      if(!start)return {days:null,label:'Not available'};
      const end=dayStart(patient?.discharge_date||asOn||new Date())||dayStart(new Date());
      const days=Math.max(0,Math.floor((end-start)/86400000)+1);
      return {days,label:days===1?'1 day':`${days} days`};
    };
    const vitalFields=['systolic','diastolic','pulse','temperature','respiration','spo2','blood_sugar','weight'];
    // Pain score is intentionally excluded from deciding whether a vital row was
    // actually recorded because older schemas defaulted pain_score to 0. That
    // default must not turn an otherwise empty row into a measured observation.
    const vitalNumber=value=>{
      if(value===null||value===undefined)return null;
      const raw=String(value).trim();
      if(!raw||['—','-','--','null','undefined','nan','n/a','na'].includes(raw.toLowerCase()))return null;
      const number=Number(raw.replace(/,/g,''));
      return Number.isFinite(number)?number:null;
    };
    // Legacy blank vital fields may have been stored as numeric zero. Zero is not a
    // plausible recorded value for BP, pulse, temperature, respiration, SpO2,
    // blood sugar or weight, so treat it as "not entered". Pain score 0 remains valid.
    const vitalMeasurement=(row,key)=>{
      const number=vitalNumber(row?.[key]);
      if(number===null)return null;
      if(number===0&&key!=='pain_score')return null;
      return number;
    };
    const hasVitalValues=row=>vitalFields.some(key=>vitalMeasurement(row,key)!==null);
    const validVitals=rows=>(rows||[]).filter(hasVitalValues);
    const normaliseTemperature=value=>{
      const measured=vitalNumber(value);
      if(measured===null||measured===0)return null;
      // Most Indian clinical entries use Fahrenheit (for example 98.4). Convert
      // plausible Fahrenheit values before applying Celsius thresholds.
      if(measured>=70&&measured<=115)return (measured-32)*5/9;
      if(measured>=25&&measured<=45)return measured;
      return null;
    };
    const vitalAlert=row=>{
      if(!hasVitalValues(row))return '';
      const systolic=vitalMeasurement(row,'systolic'),diastolic=vitalMeasurement(row,'diastolic'),pulse=vitalMeasurement(row,'pulse'),temperature=normaliseTemperature(row?.temperature),respiration=vitalMeasurement(row,'respiration'),spo2=vitalMeasurement(row,'spo2'),sugar=vitalMeasurement(row,'blood_sugar');
      const critical=(spo2!==null&&spo2<90)||(systolic!==null&&(systolic>=180||systolic<80))||(diastolic!==null&&(diastolic>=120||diastolic<50))||(pulse!==null&&(pulse>130||pulse<40))||(temperature!==null&&(temperature>=39.5||temperature<35))||(respiration!==null&&(respiration>30||respiration<8))||(sugar!==null&&(sugar>400||sugar<50));
      if(critical)return 'critical';
      const warning=(spo2!==null&&spo2<94)||(systolic!==null&&(systolic>=160||systolic<90))||(diastolic!==null&&(diastolic>=100||diastolic<60))||(pulse!==null&&(pulse>110||pulse<50))||(temperature!==null&&(temperature>=38||temperature<35.5))||(respiration!==null&&(respiration>24||respiration<10))||(sugar!==null&&(sugar>250||sugar<70));
      return warning?'warning':'normal';
    };
    // Conservative report-only assessment. It uses only clearly measured values
    // displayed in the report and never trusts a legacy stored alert label.
    const reportVitalAlert=row=>{
      const systolic=vitalMeasurement(row,'systolic');
      const diastolic=vitalMeasurement(row,'diastolic');
      const pulse=vitalMeasurement(row,'pulse');
      const spo2=vitalMeasurement(row,'spo2');
      const sugar=vitalMeasurement(row,'blood_sugar');
      const has=[systolic,diastolic,pulse,spo2,sugar].some(v=>v!==null);
      if(!has)return '';
      if((spo2!==null&&spo2<90)||(systolic!==null&&(systolic>=180||systolic<80))||(diastolic!==null&&(diastolic>=120||diastolic<50))||(pulse!==null&&(pulse>130||pulse<40))||(sugar!==null&&(sugar>400||sugar<50)))return 'critical';
      if((spo2!==null&&spo2<94)||(systolic!==null&&(systolic>=160||systolic<90))||(diastolic!==null&&(diastolic>=100||diastolic<60))||(pulse!==null&&(pulse>110||pulse<50))||(sugar!==null&&(sugar>250||sugar<70)))return 'warning';
      return 'normal';
    };
    const reportVitals=rows=>(rows||[]).filter(row=>reportVitalAlert(row));
    const roleName=id=>{const row=report?.staffMap?.[id];return row?formalName(row):(id||'Staff member');};
    async function resolveReportPatientPhoto(patient,documents){
      if(!patient)return '';
      let path=patient.photo_storage_path||'';
      if(!path){
        const photo=(documents||[]).filter(d=>d.patient_id===patient.id&&/patient photo|photograph/i.test(String(d.document_type||''))).sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0))[0];
        path=photo?.storage_path||'';
      }
      if(!path)return '';
      const {data}=await client.storage.from('patient-documents').createSignedUrl(path,1800);
      return data?.signedUrl||'';
    }

    function conditionAssessment(patient,vitals,incidents,mar){
      const measured=reportVitals(vitals);
      const critical=measured.filter(v=>reportVitalAlert(v)==='critical');
      const warning=measured.filter(v=>reportVitalAlert(v)==='warning');
      const severeIncidents=(incidents||[]).filter(i=>['high','critical','severe'].includes(String(i.severity||'').toLowerCase())&&String(i.status||'Open').toLowerCase()!=='closed');
      const exceptions=(mar||[]).filter(m=>String(m.status||'').toLowerCase()!=='given');
      if(critical.length||severeIncidents.length)return {label:'Requires clinical review',tone:'critical',reason:`${critical.length} genuinely critical measured observation(s) and ${severeIncidents.length} serious incident(s) are recorded.`};
      if(warning.length||exceptions.length>=2||patient?.oxygen_required)return {label:'Stable under observation',tone:'warning',reason:'Monitoring is continuing because an abnormal measured observation or care concern is recorded.'};
      if(!measured.length)return {label:'Clinically stable',tone:'stable',reason:'No abnormal clinical event is recorded. Vital signs were not entered for the selected period.'};
      return {label:'Clinically stable',tone:'stable',reason:'The measured observations available for the selected period are within the report thresholds, and no serious incident is recorded.'};
    }

    function referralAssessment(patient,vitals,incidents){
      const measured=validVitals(vitals);
      const critical=reportVitals(vitals).some(v=>reportVitalAlert(v)==='critical');
      const severe=(incidents||[]).some(i=>['high','critical','severe'].includes(String(i.severity||'').toLowerCase())&&String(i.status||'Open').toLowerCase()!=='closed');
      if(critical||severe)return 'Prompt review by the treating doctor is advisable. Referral or transfer to a higher centre should be considered only after clinical reassessment and according to the doctor’s advice.';
      if(patient?.oxygen_required||patient?.dressing_required||patient?.aspiration_risk)return 'Continue close observation and scheduled medical review. Escalation may be considered if there is any deterioration or inadequate response to the present care plan.';
      return 'The patient is stable on the available records, and no immediate higher-centre referral is indicated. Continue the prescribed treatment and routine medical follow-up.';
    }

    function patientHumanNarrative(p,d){
      const status=conditionAssessment(p,d.vitals,d.incidents,d.mar);
      const admissionSource=p.admission_type==='Hospital Discharge'?`following discharge from ${p.hospital_name||'a hospital'}`:p.admission_type==='Doctor Referral'?`on referral by ${p.referring_doctor||p.treating_doctor||'the referring doctor'}`:p.admission_type==='Hospital Transfer'?`as a transfer from ${p.hospital_name||'another care centre'}`:'as a direct admission to Samara';
      const pronoun=String(p.gender||'').toLowerCase()==='female'?'She':String(p.gender||'').toLowerCase()==='male'?'He':'The patient';
      const stay=lengthOfStay(p,reportDate);
      const intro='Admission Summary: '+`${formalName(p)||'The patient'} (${p.patient_id||'patient ID not assigned'}) was admitted ${admissionSource} on ${p.admission_date||'the recorded admission date'} with ${p.diagnosis?`a diagnosis of ${p.diagnosis}`:`a requirement for ${p.patient_category||'assisted-living care'}`}. ${stay.days!==null?`${pronoun} has completed ${stay.label} of stay as on ${formatDateIN(reportDate)}. `:''}${p.allergies?`Known allergies: ${p.allergies}.`:'No allergy is documented in the available record.'}`;
      const medPlan=(d.medicationOrders||[]).filter(x=>x.is_active!==false);
      const carePlan=(d.careOrders||[]).filter(x=>x.is_active!==false);
      const medDetails=medPlan.slice(0,6).map(x=>`${x.medicine_name||'Medicine'}${x.strength?` ${x.strength}`:''}${x.dose?` - ${x.dose}`:''}${x.route?` (${x.route})`:''}${Array.isArray(x.scheduled_times)&&x.scheduled_times.length?` at ${x.scheduled_times.join(', ')}`:''}`).join('; ');
      const careDetails=carePlan.slice(0,8).map(x=>`${x.care_type||'Care task'}${x.shift?` - ${x.shift}`:''}${x.frequency?` - ${x.frequency}`:''}${x.instruction?` (${x.instruction})`:''}`).join('; ');
      const completedMeds=(d.mar||[]).filter(x=>String(x.status||'').toLowerCase()==='given').length;
      const careSentences=[];
      if(medPlan.length)careSentences.push(`Treatment is continuing according to the active prescription${medDetails?`: ${medDetails}`:''}. ${completedMeds} administered dose record(s) are available for the selected period`);
      else careSentences.push('No active medicine prescription is available in the selected record');
      if(carePlan.length)careSentences.push(`The active care plan includes ${careDetails}`);
      else if(d.care.length)careSentences.push(`${d.care.length} nursing/personal-care activity record(s) were entered during the period`);
      else careSentences.push('Routine assisted-living support is continuing; no separate detailed care-plan order is recorded');
      if(d.physioOrders?.length||d.physioSessions.length)careSentences.push(`Physiotherapy is ${d.physioSessions.length?'documented during the period':'included in the active plan'}${d.physioOrders?.length?`: ${d.physioOrders.slice(0,4).map(x=>`${x.therapy_type||'Therapy'}${x.frequency?` - ${x.frequency}`:''}`).join('; ')}`:''}`);
      if(p.diet_plan||p.feeding_instruction||d.meals.length)careSentences.push(`Dietary care is being provided${p.diet_plan?` as ${p.diet_plan}`:''}${p.feeding_instruction?` with instructions: ${p.feeding_instruction}`:''}${d.meals.length?`; ${d.meals.length} meal/intake record(s) are available`:''}`);
      const careText='Care and Treatment Provided: '+careSentences.join('. ')+'.';
      const measured=reportVitals(d.vitals);
      const latestVital=latest(measured,['recorded_at','created_at']);
      const latestText=latestVital?`The latest measured observations were BP ${vitalMeasurement(latestVital,'systolic')??'—'}/${vitalMeasurement(latestVital,'diastolic')??'—'} mmHg, pulse ${vitalMeasurement(latestVital,'pulse')??'—'}/min, SpO₂ ${vitalMeasurement(latestVital,'spo2')??'—'}% and blood sugar ${vitalMeasurement(latestVital,'blood_sugar')!==null?`${latestVital.blood_sugar_type||'RBS'} ${vitalMeasurement(latestVital,'blood_sugar')} mg/dL`:'—' }.`:'No measured vital-sign values were entered for this reporting period.';
      const current=`Current Clinical Status: ${pronoun} is clinically stable on the available records unless a genuine abnormal measurement or serious incident is specifically listed below. ${status.reason} ${latestText}`;
      const familyNoted=d.incidents.some(i=>i.family_informed===true||/family|relative|attendant/i.test(String(i.immediate_action||i.remarks||i.description||'')));
      const family=`Family Communication: ${familyNoted?'The available records indicate that the family/attendant was informed regarding the patient’s condition or a significant event.':'No specific family communication entry is available for the selected reporting period.'}`;
      const next=`Plan and Recommendation: ${referralAssessment(p,d.vitals,d.incidents)} Continue care strictly according to the active prescription and care plan, including nursing assistance, diet, physiotherapy and documented risk precautions.`;
      return [intro,careText,current,family,next];
    }

    function dailyPatientNarrative(p,all){
      const d={
        vitals:byPatient(all.vitals,p.id),care:byPatient(all.care,p.id),mar:byPatient(all.mar,p.id),meals:byPatient(all.meals,p.id),physioSessions:byPatient(all.physioSessions,p.id),incidents:byPatient(all.incidents,p.id)
      };
      const status=conditionAssessment(p,d.vitals,d.incidents,d.mar);
      const activity=[];
      if(d.mar.length)activity.push(`${d.mar.filter(x=>String(x.status||'').toLowerCase()==='given').length}/${d.mar.length} medicine action(s) given`);
      if(d.care.length)activity.push(`${d.care.length} care task(s)`);
      if(d.meals.length)activity.push(`${d.meals.length} meal/intake record(s)`);
      if(d.physioSessions.length)activity.push(`${d.physioSessions.length} physiotherapy session(s)`);
      if(d.vitals.length)activity.push(`${d.vitals.length} vital-sign check(s)`);
      const exception=d.mar.filter(x=>String(x.status||'').toLowerCase()!=='given').length;
      return `${formalName(p)} (${p.patient_id||'No ID'}, Room ${p.room_no||'unassigned'}${p.bed_no?`/${p.bed_no}`:''}) — ${status.label}. ${activity.length?activity.join(', '):'No clinical activity was entered'}.${exception?` ${exception} medicine exception(s) require review.`:''}${d.incidents.length?` ${d.incidents.length} incident(s) were recorded.`:''}`;
    }

    async function generate(e,requestedMode){
      if(e)e.preventDefault();
      const activeMode=requestedMode||mode;
      setMessage('');setReport(null);
      if(isFutureDateIndia(reportDate)){
        const today=todayISOIndia();
        setReportDate(today);
        setMessage(`Future report dates are not permitted. Report Date has been reset to today (${formatDateIN(today)}).`);
        return;
      }
      if(activeMode==='Patient-wise'&&!patientId){setMessage('Select a patient.');return;}
      if(activeMode==='Day-wise'&&!reportDate){setMessage('Select a report date.');return;}
      setBusy(true);
      try{
        const results=await Promise.all([
          client.from('patients').select('*'),client.from('vital_signs').select('*'),client.from('care_logs').select('*'),client.from('care_orders').select('*'),client.from('medication_orders').select('*'),client.from('medication_administrations').select('*'),client.from('meal_records').select('*'),client.from('physiotherapy_plans').select('*'),client.from('physiotherapy_sessions').select('*'),client.from('incidents').select('*'),client.from('billing_transactions').select('*'),client.from('recovery_events').select('*'),client.from('shift_handovers').select('*'),client.from('patient_documents').select('*'),client.from('profiles').select('*'),client.from('audit_log').select('*')
        ]);
        const [pats,vitals,care,careOrders,orders,mar,meals,physioOrders,physioSessions,incidents,billing,recovery,handovers,documents,staff,audit]=results.map(safeRows);
        const selectedPatient=pats.find(p=>p.id===patientId)||patients.find(p=>p.id===patientId)||null;
        if(activeMode==='Patient-wise'&&selectedPatient&&isFutureDateIndia(selectedPatient.admission_date)){
          throw new Error(`The Patient File contains a future Admission Date (${formatDateIN(selectedPatient.admission_date)}). Please correct it in Patient Edit before generating or sharing the report.`);
        }
        const dayData={
          vitals:byDay(vitals,reportDate,['recorded_at','created_at']),care:byDay(care,reportDate,['completed_at','created_at','care_date']),careOrders:careOrders.filter(x=>x.is_active!==false),mar:byDay(mar,reportDate,['administered_at','created_at','scheduled_date']),meals:byDay(meals,reportDate,['served_at','created_at','meal_date']),physioSessions:byDay(physioSessions,reportDate,['session_at','created_at','session_date']),incidents:byDay(incidents,reportDate,['incident_at','created_at']),billing:byDay(billing,reportDate,['transaction_date','created_at']),recovery:byDay(recovery,reportDate,['event_at','created_at']),handovers:byDay(handovers,reportDate,['created_at','handover_date']),documents:byDay(documents,reportDate,['created_at','report_date']),audit:byDay(audit,reportDate,['created_at'])
        };
        const data=activeMode==='Patient-wise'?{
          patients:selectedPatient?[selectedPatient]:[],vitals:byPatient(vitals,patientId),care:byPatient(care,patientId),careOrders:byPatient(careOrders,patientId),medicationOrders:byPatient(orders,patientId),mar:byPatient(mar,patientId),meals:byPatient(meals,patientId),physioOrders:byPatient(physioOrders,patientId),physioSessions:byPatient(physioSessions,patientId),incidents:byPatient(incidents,patientId),billing:byPatient(billing,patientId),recovery:byPatient(recovery,patientId),handovers:handovers.filter(r=>text(r.patient_summary).toLowerCase().includes(text(formalName(selectedPatient)).toLowerCase())),documents:byPatient(documents,patientId)
        }:{...dayData,patients:pats.filter(p=>p.is_active!==false&&dateOnly(p.admission_date)<=reportDate),newAdmissions:pats.filter(p=>dateOnly(p.admission_date)===reportDate)};
        const charges=data.billing.filter(x=>x.transaction_type==='Charge').reduce((a,x)=>a+Number(x.amount||0),0);
        const payments=data.billing.filter(x=>x.transaction_type==='Payment').reduce((a,x)=>a+Number(x.amount||0),0);
        const discounts=data.billing.filter(x=>x.transaction_type==='Discount').reduce((a,x)=>a+Number(x.amount||0),0);
        const criticalVitals=reportVitals(data.vitals).filter(x=>reportVitalAlert(x)==='critical');
        const medicineExceptions=data.mar.filter(x=>String(x.status||'').toLowerCase()!=='given');
        const activeStaffIds=new Set();
        [...data.care,...data.mar,...data.vitals,...data.physioSessions,...data.incidents,...(data.audit||[])].forEach(r=>[r.completed_by,r.administered_by,r.recorded_by,r.performed_by,r.reported_by,r.user_id].filter(Boolean).forEach(id=>activeStaffIds.add(id)));
        const staffMap=Object.fromEntries(staff.map(x=>[x.id,x]));
        const onDuty=staff.filter(x=>activeStaffIds.has(x.id));
        const patientPhoto=mode==='Patient-wise'?await resolveReportPatientPhoto(selectedPatient,documents):'';
        setMode(activeMode);setReport({mode:activeMode,patient:selectedPatient,patientPhoto,date:reportDate,data,staffMap,onDuty,summary:{charges,payments,discounts,outstanding:charges-payments-discounts,criticalVitals:criticalVitals.length,medicinesGiven:data.mar.filter(x=>String(x.status||'').toLowerCase()==='given').length,medicineExceptions:medicineExceptions.length,openingPatients:activeMode==='Day-wise'?data.patients.length:0,newAdmissions:activeMode==='Day-wise'?data.newAdmissions.length:0}});
      }catch(error){setMessage(error.message||'Unable to generate report.');}
      setBusy(false);
    }

    function printReport(){
      const previous=document.title;
      const stamp=new Date().toLocaleString('en-GB',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).replace(/[\/:,]/g,'-').replace(/\s+/g,'_');
      const base=report?.mode==='Patient-wise'?(formalName(report.patient)||'Patient'):'Samara_Daily_Report';
      document.title=`${base} - Report as on ${stamp}`;
      window.addEventListener('afterprint',()=>{document.title=previous},{once:true});
      window.print();
      setTimeout(()=>{document.title=previous},1500);
    }
    function section(title,items,renderer){return h('div',{className:'intelligent-report-section'},h('h3',null,title),items.length?h('div',{className:'intelligent-report-list'},items.map((x,i)=>h('div',{className:'intelligent-report-item',key:i},renderer(x)))):h('p',{className:'small-note'},'No records for this report.'));}
    function narrative(){
      if(!report)return [];
      if(report.mode==='Patient-wise')return patientHumanNarrative(report.patient||{},report.data);
      const d=report.data,s=report.summary;
      const opening=`The facility opened the day with ${s.openingPatients} active patient(s). ${s.newAdmissions} new admission(s) were recorded${d.newAdmissions?.length?`: ${d.newAdmissions.map(p=>formalName(p)).join(', ')}`:'.'}`;
      const clinical=`Clinical activity included ${d.vitals.length} vital-sign check(s), ${d.care.length} care task(s), ${d.mar.length} medicine action(s), ${d.meals.length} meal/intake record(s) and ${d.physioSessions.length} physiotherapy session(s). ${s.criticalVitals} critical vital alert(s), ${s.medicineExceptions} medicine exception(s) and ${d.incidents.length} incident(s) require review.`;
      const staffing=`Recorded care activity was entered by ${report.onDuty.length} employee(s) during the day${report.onDuty.length?`: ${report.onDuty.map(x=>`${formalName(x)} (${x.role})`).join(', ')}`:'. No staff activity could be derived from the available records.'}`;
      const finance=`The financial statement for the day shows charges of ${money(s.charges)}, payments of ${money(s.payments)}, discounts of ${money(s.discounts)} and a net outstanding movement of ${money(s.outstanding)}.`;
      const close=`Overall, the day was ${s.criticalVitals||d.incidents.length?'clinically active and requires managerial/medical follow-up on the alerts noted below':'operationally stable on the available records'}. Patient-wise details are provided in the following section.`;
      return [opening,clinical,staffing,finance,close];
    }

    const selectedPatient=()=>report?.mode==='Patient-wise'?(report.patient||patients.find(p=>p.id===patientId)):null;
    const relativeName=p=>p?.attendant_name||p?.relative_name||p?.emergency_contact_name||p?.family_contact_name||'Authorised Relative';
    const patientPhone=p=>p?.mobile||p?.patient_mobile||p?.phone||'';
    const relativePhone=p=>p?.attendant_phone||p?.relative_phone||p?.emergency_contact_phone||p?.family_contact_phone||p?.reference_contact||'';
    const reportStatusText=()=>{
    const p=selectedPatient();
    if(!p)return '';
    const date=formatDateIN(report?.date||reportDate);
    const base=`${formalName(p)}'s care report dated ${date} has been prepared by Samara Care.`;
    return base;
    };
    function quickHealthSummary(language='English'){
      const p=selectedPatient();
      const d=report?.data||{};
      if(!p)return '';
      const measured=reportVitals(d.vitals||[]);
      const lastVital=latest(measured,['recorded_at','created_at']);
      const assessment=conditionAssessment(p,d.vitals||[],d.incidents||[],d.mar||[]);
      const status=assessment.tone==='critical'?'Clinical review required':assessment.tone==='warning'?'Under observation':'Stable';
      const mar=d.mar||[];
      const care=d.care||[];
      const meals=d.meals||[];
      const physio=d.physioSessions||[];
      const incidents=d.incidents||[];
      const givenRows=mar.filter(x=>String(x.status||'').toLowerCase()==='given');
      const given=givenRows.length;
      const orderMap=Object.fromEntries((d.medicationOrders||[]).map(order=>[order.id,order]));
      const medicineNames=[...new Set(givenRows.map(row=>{
        const order=orderMap[row.order_id]||{};
        return [row.medicine_name||order.medicine_name,row.strength||row.dose||order.strength||order.dose].filter(Boolean).join(' ').trim();
      }).filter(Boolean))];
      const medicineList=medicineNames.join(', ');
      const exceptions=mar.filter(x=>!['given','completed'].includes(String(x.status||'').toLowerCase())).length;
      const completedCare=care.filter(x=>['completed','done','given'].includes(String(x.status||'').toLowerCase())).length;
      const mealCount=meals.length;
      const physioCompleted=physio.filter(x=>String(x.status||'').toLowerCase()==='completed').length;
      const vitalParts=[];
      if(lastVital){
        const sys=vitalMeasurement(lastVital,'systolic'),dia=vitalMeasurement(lastVital,'diastolic');
        const pulse=vitalMeasurement(lastVital,'pulse'),spo2=vitalMeasurement(lastVital,'spo2');
        const temp=vitalMeasurement(lastVital,'temperature'),sugar=vitalMeasurement(lastVital,'blood_sugar');
        if(sys!==null||dia!==null)vitalParts.push(`BP ${sys??'—'}/${dia??'—'} mmHg`);
        if(pulse!==null)vitalParts.push(`Pulse ${pulse}/min`);
        if(spo2!==null)vitalParts.push(`SpO₂ ${spo2}%`);
        if(temp!==null)vitalParts.push(`Temperature ${temp}°`);
        if(sugar!==null)vitalParts.push(`${lastVital.blood_sugar_type||'RBS'} ${sugar} mg/dL`);
      }
      const date=formatDateIN(report?.date||reportDate);
      if(language==='Tamil'){
        const statusTamil=status==='Stable'?'நிலை சீராக உள்ளது':status==='Under observation'?'கண்காணிப்பில் உள்ளார்':'மருத்துவ பரிசீலனை தேவை';
        const lines=[
          `தேதி: ${date}`,
          `தற்போதைய நிலை: ${statusTamil}`,
          vitalParts.length?`சமீபத்திய உயிர்க்குறிகள்: ${vitalParts.join(' | ')}`:'இன்றைய உயிர்க்குறி பதிவு இல்லை.',
          mar.length?`வழங்கப்பட்ட மருந்துகள்: ${given} முறை${medicineList?` — ${medicineList}`:''}${exceptions?`; ${exceptions} விதிவிலக்கு/தாமதம் பதிவாகியுள்ளது`:''}.`:'இன்றைய மருந்து நிர்வாக பதிவு இல்லை.',
          care.length?`தினசரி பராமரிப்பு: ${completedCare} பணிகள் நிறைவு.`:'இன்றைய தினசரி பராமரிப்பு பதிவு இல்லை.',
          mealCount?`உணவு/திரவ பதிவு: ${mealCount}.`:'இன்றைய உணவு/திரவ பதிவு இல்லை.',
          physio.length?`உடற்பயிற்சி: ${physioCompleted} அமர்வுகள் நிறைவு.`:'இன்றைய உடற்பயிற்சி பதிவு இல்லை.',
          incidents.length?`சம்பவங்கள்: ${incidents.length} பதிவு — மேலாண்மை பரிசீலனை தேவை.`:'சம்பவம் எதுவும் பதிவாகவில்லை.'
        ];
        return lines.join('\n');
      }
      const lines=[
        `Report date: ${date}`,
        `Current status: ${status}`,
        vitalParts.length?`Latest vitals: ${vitalParts.join(' | ')}`:'No vital-sign reading was recorded for the selected date.',
        mar.length?`Medicines given: ${given} administration${given===1?'':'s'} recorded${medicineList?` — ${medicineList}`:''}${exceptions?`; ${exceptions} exception${exceptions===1?'':'s'} require review`:''}.`:'No medicine administration was recorded for the selected date.',
        care.length?`Daily care: ${completedCare} task${completedCare===1?'':'s'} completed.`:'No daily-care activity was recorded for the selected date.',
        mealCount?`Food and intake: ${mealCount} record${mealCount===1?'':'s'} available.`:'No food or intake record was entered for the selected date.',
        physio.length?`Physiotherapy: ${physioCompleted} session${physioCompleted===1?'':'s'} completed.`:'No physiotherapy session was recorded for the selected date.',
        incidents.length?`Incidents: ${incidents.length} event${incidents.length===1?'':'s'} recorded and requiring review.`:'Incidents: None recorded.'
      ];
      return lines.join('\n');
    }

    function buildWhatsAppMessage(p,recipientType){
    const recipient=recipientType==='Patient'?(formalName(p)||'Resident'):relativeName(p);
    const patientLabel=formalName(p)||'the resident';
    const date=formatDateIN(report?.date||reportDate);
    if(shareLanguage==='Tamil'){
      if(shareType==='Full Intelligent Report'){
        return `வணக்கம் ${recipient},\n\n${patientLabel} அவர்களின் ${date} தேதியிட்ட முழுமையான Intelligent Patient Report தயாராக உள்ளது. இந்த அறிக்கை ரகசியமானது; அங்கீகரிக்கப்பட்ட பெறுநருக்காக மட்டுமே பகிரப்படுகிறது.\n\nWhatsApp-இல் இணைக்கப்பட்ட PDF அறிக்கையைப் பார்க்கவும். மருத்துவ அவசர நிலை இருந்தால், Samara Care குழுவை நேரடியாக தொடர்புகொள்ளவும்.\n\nSamara Health Care LLP`;
      }
      return `வணக்கம் ${recipient},\n\n${patientLabel} அவர்களின் விரைவு உடல்நிலை அறிக்கை\n\n${quickHealthSummary('Tamil')}\n\nஇந்த சுருக்கம் தேர்ந்தெடுக்கப்பட்ட தேதிக்கான Samara Care ERP பதிவுகளிலிருந்து உருவாக்கப்பட்டது. கூடுதல் விளக்கம் அல்லது அவசர மருத்துவ உதவி தேவைப்பட்டால் Samara Care குழுவை தொடர்புகொள்ளவும்.\n\nSamara Health Care LLP`;
    }
    if(shareType==='Full Intelligent Report'){
      return `Dear ${recipient},\n\nPlease find the full Intelligent Patient Report for ${patientLabel}, dated ${date}.\n\nThis report is confidential and intended only for the authorised recipient. Please review the attached PDF. For any urgent clinical concern, contact the Samara Care team directly.\n\nRegards,\nSamara Health Care LLP`;
    }
    return `Dear ${recipient},\n\nQuick Health Update for ${patientLabel}\n\n${quickHealthSummary('English')}\n\nThis update is generated from the records entered in Samara Care ERP for the selected date. Please contact the Samara Care team for clarification or urgent clinical concerns.\n\nRegards,\nSamara Health Care LLP`;
    }
    async function recordCommunication(p,recipientType,number,messageText){
    const {data:{user}}=await client.auth.getUser();
    const payload={
      patient_id:p.id,
      communication_type:shareType,
      method:'WhatsApp',
      recipient_type:recipientType,
      recipient_name:recipientType==='Patient'?(formalName(p)||p.full_name):relativeName(p),
      recipient_number:number,
      report_date:report?.date||reportDate,
      status:'WhatsApp Opened',
      message_preview:messageText.slice(0,500),
      sent_by:user?.id||profile?.auth_user_id||profile?.id
    };
    const {error}=await client.from('patient_communications').insert(payload);
    if(error)console.warn('Communication history could not be saved:',error);
    }
    async function openWhatsAppShare(){
    if(!['Admin','Manager'].includes(profile.role))return alert('WhatsApp report sharing is available only to Admin and Manager.');
    const p=selectedPatient();
    if(!p)return alert('Generate a patient report before sharing.');
    const targets=shareRecipient==='Both'?['Patient','Relative']:[shareRecipient];
    const missing=[];
    const prepared=[];
    targets.forEach(type=>{
      const raw=type==='Patient'?patientPhone(p):relativePhone(p);
      const number=whatsappNumber(raw);
      if(!number)missing.push(type);
      else prepared.push({type,number,text:buildWhatsAppMessage(p,type)});
    });
    if(missing.length)return alert(`WhatsApp number is not available for: ${missing.join(', ')}. Please update the Patient File first.`);
    if(shareType==='Full Intelligent Report'){
      alert('Please first use “Print / Save PDF” to save the report. WhatsApp will now open with the prepared message; attach the saved PDF manually before sending.');
    }
    setShareBusy(true);
    for(const item of prepared){
      window.open(`https://wa.me/${item.number}?text=${encodeURIComponent(item.text)}`,'_blank','noopener');
      await recordCommunication(p,item.type,item.number,item.text);
    }
    setShareBusy(false);setShareOpen(false);loadCommunicationHistory();
    }

    const patientReportBody=()=>{
      const p=report.patient||{};
      const d=report.data||{};
      const status=conditionAssessment(p,d.vitals||[],d.incidents||[],d.mar||[]);
      const measured=reportVitals(d.vitals||[]);
      const lastVital=latest(measured,['recorded_at','created_at']);
      const stay=lengthOfStay(p,report.date||reportDate);
      const given=(d.mar||[]).filter(x=>String(x.status||'').toLowerCase()==='given').length;
      const late=(d.mar||[]).filter(x=>String(x.status||'').toLowerCase()==='late').length;
      const omitted=(d.mar||[]).filter(x=>['missed','omitted','refused','not given'].includes(String(x.status||'').toLowerCase())).length;
      const completedCare=(d.care||[]).filter(x=>['completed','done','given'].includes(String(x.status||'').toLowerCase())).length;
      const physioCompleted=(d.physioSessions||[]).filter(x=>String(x.status||'').toLowerCase()==='completed').length;
      const incidentCount=(d.incidents||[]).length;
      const statusLabel=status.tone==='critical'?'REQUIRES CLINICAL REVIEW':status.tone==='warning'?'UNDER OBSERVATION':'STABLE';
      const vitals=[
        ['Blood Pressure',lastVital&&(vitalMeasurement(lastVital,'systolic')!==null||vitalMeasurement(lastVital,'diastolic')!==null)?`${vitalMeasurement(lastVital,'systolic')??'—'} / ${vitalMeasurement(lastVital,'diastolic')??'—'} mmHg`:'—'],
        ['Pulse Rate',lastVital&&vitalMeasurement(lastVital,'pulse')!==null?`${vitalMeasurement(lastVital,'pulse')} /min`:'—'],
        ['SpO₂',lastVital&&vitalMeasurement(lastVital,'spo2')!==null?`${vitalMeasurement(lastVital,'spo2')} %`:'—'],
        ['Temperature',lastVital&&vitalMeasurement(lastVital,'temperature')!==null?`${vitalMeasurement(lastVital,'temperature')} °`:'—'],
        ['Respiratory Rate',lastVital&&vitalMeasurement(lastVital,'respiration')!==null?`${vitalMeasurement(lastVital,'respiration')} /min`:'—'],
        ['Blood Sugar',lastVital&&vitalMeasurement(lastVital,'blood_sugar')!==null?`${lastVital.blood_sugar_type||'RBS'} · ${vitalMeasurement(lastVital,'blood_sugar')} mg/dL`:'Not Taken'],
        ['Weight',lastVital&&vitalMeasurement(lastVital,'weight')!==null?`${vitalMeasurement(lastVital,'weight')} kg`:'—']
      ];
      const box=(title,icon,rows,note)=>h('div',{className:'clinical-box'},
        h('h3',null,h('span',{className:'clinical-box-icon','aria-hidden':'true'},icon),title),
        h('div',{className:'clinical-box-rows'},rows.map(([label,value])=>h('div',{className:'clinical-box-row',key:label},h('span',null,label),h('strong',null,value)))),
        note?h('div',{className:'clinical-box-note'},note):null
      );
    return h(React.Fragment,null,
        h('div',{className:'hospital-report-title'},
          h('strong',null,'SAMARA HEALTH CARE LLP'),
          h('span',null,'Assisted Living Management System'),
          h('h1',null,'PATIENT CARE REPORT'),
          h('small',null,`Generated on · ${formatDateTimeIN(new Date())}`)
        ),
        h('div',{className:'resident-overview-card'},
          h('div',{className:'resident-overview-heading'},'RESIDENT OVERVIEW'),
          h('div',{className:'resident-overview-grid'},
            h('div',{className:'resident-overview-photo'},report.patientPhoto?h('img',{src:report.patientPhoto,alt:formalName(p)}):h('div',{className:'report-photo-placeholder'},'SC')),
            h('div',{className:'resident-overview-main'},
              h('h2',null,formalName(p)||'Patient'),
              h('div',{className:'overview-detail-grid'},
                h('div',null,h('b',null,'Patient ID'),h('span',null,p.patient_id||'—')),
                h('div',null,h('b',null,'Room / Bed'),h('span',null,`${p.room_no||'Unassigned'}${p.bed_no?`-${p.bed_no}`:''}`)),
                h('div',null,h('b',null,'Admission Type'),h('span',null,p.admission_type||'—')),
                h('div',null,h('b',null,'Admission Date'),h('span',null,formatDateIN(p.admission_date))),
                h('div',null,h('b',null,'Duration of Stay'),h('span',null,stay.label))
              )
            ),
            h('div',{className:'resident-overview-clinical'},
              h('div',null,h('b',null,'Diagnosis'),h('span',null,p.diagnosis||'Not recorded')),
              h('div',null,h('b',null,'Treating Doctor'),h('span',null,p.treating_doctor||p.referring_doctor||'Not recorded')),
              h('div',null,h('b',null,'Allergies'),h('span',null,p.allergies||'None recorded')),
              h('div',null,h('b',null,'Emergency Contact'),h('span',null,`${p.emergency_contact_name||p.attendant_name||'Not available'}${p.emergency_contact_number||p.attendant_phone?` · ${p.emergency_contact_number||p.attendant_phone}`:''}`))
            )
          ),
          h('div',{className:`clinical-current-status ${status.tone}`},h('span',null,'✓'),h('b',null,'Current Status'),h('strong',null,statusLabel))
        ),
        h('div',{className:'clinical-summary-card'},
          h('h3',null,'CLINICAL CARE SUMMARY'),
          narrative().map((line,i)=>h('p',{key:i},line))
        ),
        h('div',{className:'clinical-report-grid'},
          box('VITAL SIGNS SUMMARY','♥',vitals,lastVital?`Latest available observation: ${fmt(lastVital.recorded_at||lastVital.created_at)}`:'No vital observations were recorded for the selected period.'),
          box('MEDICATION ADMINISTRATION','●',[["Medicines Scheduled",(d.mar||[]).length],["Medicines Given",given],["Late",late],["Missed / Omitted",omitted]],(d.mar||[]).length?'Medication activity is summarised above.':'No medication records for the selected period.'),
          box('DAILY CARE AND NURSING','♟',[["Care Activities Planned",(d.careOrders||[]).length],["Care Activities Recorded",(d.care||[]).length],["Care Activities Completed",completedCare],["Assistance with ADL",(d.care||[]).length?'Recorded':'—']],(d.care||[]).length?'Care entries are summarised above.':'No care activity records for the selected period.'),
          box('FOOD, DIET AND INTAKE','♨',[["Diet Type",p.diet_type||p.food_preference||'Normal Diet'],["Meal Records",(d.meals||[]).length],["Average Intake",(d.meals||[]).length?'Recorded':'—'],["Hydration Status",'—']],(d.meals||[]).length?'Meal and intake records are available.':'No intake records for the selected period.'),
          box('PHYSIOTHERAPY','♿',[["Sessions Planned",(d.physioOrders||[]).length],["Sessions Recorded",(d.physioSessions||[]).length],["Sessions Completed",physioCompleted],["Remarks",(d.physioSessions||[]).length?'Available':'—']],(d.physioSessions||[]).length?'Physiotherapy activity is summarised above.':'No physiotherapy records for the selected period.'),
          box('INCIDENT REPORTS','▲',[["Total Incidents",incidentCount],["Falls",(d.incidents||[]).filter(x=>/fall/i.test(String(x.incident_type||x.type||''))).length],["Medical Emergencies",(d.incidents||[]).filter(x=>/emergency|transfer/i.test(String(x.incident_type||x.type||''))).length],["Open Incidents",(d.incidents||[]).filter(x=>String(x.status||'Open').toLowerCase()!=='closed').length]],incidentCount?'Incident details are available below.':'No reportable incidents during the selected period.')
        ),
        h('div',{className:'financial-summary-card'},
          h('h3',null,'₹  FINANCIAL STATEMENT'),
          h('div',{className:'financial-summary-grid'},
            h('div',null,h('span',null,'Charges'),h('strong',null,money(report.summary.charges))),
            h('div',null,h('span',null,'Payments / Advances'),h('strong',null,money(report.summary.payments))),
            h('div',null,h('span',null,'Discounts'),h('strong',null,money(report.summary.discounts))),
            h('div',{className:'outstanding'},h('span',null,'Outstanding Balance'),h('strong',null,money(report.summary.outstanding)))
          )
        ),
        h('div',{className:'recovery-summary-card'},h('h3',null,'↗  RECOVERY / PROGRESS TIMELINE'),(d.recovery||[]).length?h('div',{className:'intelligent-report-list'},d.recovery.map((r,i)=>h('div',{className:'intelligent-report-item',key:i},h('strong',null,r.event_type||'Progress'),h('span',null,`${r.note||'—'} · ${fmt(r.event_at||r.created_at)}`)))):h('p',null,'No progress timeline data is available for the selected period.')),
        h('div',{className:'hospital-report-footer'},
          h('div',null,h('strong',null,'Samara Health Care LLP'),h('span',null,'Assisted Living Management System'),h('em',null,'Caring with Compassion. Living with Dignity.')),
          h('div',null,h('span',null,'Prepared by'),h('strong',null,formalName(profile))),
          h('div',null,h('span',null,'Generated on'),h('strong',null,formatDateTimeIN(new Date())))
        )
      );
    };

    return h(React.Fragment,null,
      h(Section,{title:'Intelligent Reports',subtitle:'Human-readable patient progress and complete day-wise operational reports'},
        h('form',{className:'intelligent-report-controls intelligent-report-controls-v3',onSubmit:e=>e.preventDefault()},
          h('div',{className:'field report-date-field'},h('label',null,'Report Date'),h('input',{type:'date',value:reportDate,max:todayISOIndia(),onChange:e=>{const next=e.target.value;if(isFutureDateIndia(next)){const today=todayISOIndia();setReportDate(today);setReport(null);setMessage(`Future report dates are not permitted. Report Date has been reset to today (${formatDateIN(today)}).`);return}setReportDate(next);setReport(null);setMessage('')},required:true})),
          h('div',{className:'field report-patient-field'},h('label',null,'Patient'),h('select',{value:patientId,onChange:e=>{setPatientId(e.target.value);setReport(null);setMessage('')}},h('option',{value:''},'Select patient'),patients.map(p=>h('option',{key:p.id,value:p.id},`${formalName(p)} · ${p.patient_id||'NO-ID'}${p.room_no?` · ${p.room_no}${p.bed_no?`-${p.bed_no}`:''}`:''}`)))),
          h('button',{type:'button',className:'btn btn-primary',disabled:busy,onClick:e=>generate(e,'Patient-wise')},busy&&mode==='Patient-wise'?'Generating…':'Generate Patient Report'),
          h('button',{type:'button',className:'btn btn-secondary',disabled:busy,onClick:e=>generate(e,'Day-wise')},busy&&mode==='Day-wise'?'Generating…':'Generate Daily Operations Report')
        ),message&&h('div',{className:'message error'},message)
      ),
      report&&h('div',{className:'card panel intelligent-report printable-report hospital-report'},
        h('div',{className:'panel-head no-print'},h('div',null,h('h2',null,report.mode==='Patient-wise'?`Patient Care Report – ${formalName(report.patient)||''}`:`Daily Facility Report – ${formatDateIN(report.date)}`),h('small',null,`Prepared by ${formalName(profile)} on ${formatDateTimeIN(new Date())}`)),h('div',{className:'actions'},report.mode==='Patient-wise'&&['Admin','Manager'].includes(profile.role)&&h('button',{type:'button',className:'btn btn-whatsapp',onClick:()=>setShareOpen(true)},'WhatsApp'),h('button',{className:'btn btn-secondary',onClick:printReport},'Print / Save PDF'))),
        report.mode==='Patient-wise'?patientReportBody():h(React.Fragment,null,
          h('div',{className:'intelligent-summary human-report'},h('h3',null,'Executive Daily Summary'),narrative().map((p,i)=>h('p',{key:i},p))),
          section('Patient-wise Daily Status',report.data.patients,p=>h(React.Fragment,null,h('strong',null,`${p.patient_id||'NO-ID'} · ${formalName(p)}`),h('span',null,dailyPatientNarrative(p,report.data)))),
          section('Employees Active / On Duty',report.onDuty,x=>h(React.Fragment,null,h('strong',null,formalName(x)),h('span',null,`${x.role||'Employee'} · ${x.employee_id||x.login_id||'—'}`))),
          section('Incident Reports',report.data.incidents,r=>h(React.Fragment,null,h('strong',null,patientName(r.patient_id)),h('span',null,`${r.incident_type||r.type||'Incident'} · ${r.description||r.remarks||'—'} · ${fmt(r.incident_at||r.created_at)}`))),
          section('Financial Statement',report.data.billing,r=>h(React.Fragment,null,h('strong',null,patientName(r.patient_id)),h('span',null,`${r.transaction_type||'—'} · ${money(r.amount)} · ${r.description||'—'}`))),
          h('div',{className:'report-footer'},h('strong',null,'Samara Health Care LLP'),h('span',null,'Assisted Living Management System'),h('span',null,'Caring with Compassion. Living with Dignity.'),h('small',null,`Prepared by ${formalName(profile)} · Generated ${formatDateTimeIN(new Date())}`))
        )
      ),
      ['Admin','Manager'].includes(profile.role)&&communicationRows.length>0&&h(Section,{title:'Report Communication History',subtitle:'Manual WhatsApp sharing activity recorded by the ERP'},
        h('div',{className:'table-wrap'},h('table',{className:'table'},
          h('thead',null,h('tr',null,['Patient','Report Date','Recipient','Number','Type','Status','Opened By','Date / Time'].map(x=>h('th',{key:x},x)))),
          h('tbody',null,communicationRows.filter(r=>!patientId||r.patient_id===patientId).slice(0,50).map(r=>h('tr',{key:r.id},
            h('td',null,patientName(r.patient_id)),
            h('td',null,formatDateIN(r.report_date)),
            h('td',null,`${r.recipient_type||'—'} · ${r.recipient_name||'—'}`),
            h('td',null,r.recipient_number||'—'),
            h('td',null,r.communication_type||'—'),
            h('td',null,r.status||'—'),
            h('td',null,r.sent_by===profile.id||r.sent_by===profile.auth_user_id?formalName(profile):'Staff'),
            h('td',null,fmt(r.created_at))
          )))
        ))
      ),
      shareOpen&&h('div',{className:'modal-backdrop',onClick:e=>{if(e.target===e.currentTarget)setShareOpen(false)}},
        h('div',{className:'card modal'},
          h('div',{className:'panel-head'},h('div',null,h('h3',null,'Share Intelligent Report through WhatsApp'),h('small',null,reportStatusText())),h('button',{type:'button',className:'close',onClick:()=>setShareOpen(false)},'×')),
          h('div',{className:'modal-grid'},
            h('div',{className:'field'},h('label',null,'Send to'),h('select',{value:shareRecipient,onChange:e=>setShareRecipient(e.target.value)},['Patient','Relative','Both'].map(x=>h('option',{key:x,value:x},x)))),
            h('div',{className:'field'},h('label',null,'Sharing option'),h('select',{value:shareType,onChange:e=>setShareType(e.target.value)},['Quick Health Update','Full Intelligent Report'].map(x=>h('option',{key:x,value:x},x)))),
            h('div',{className:'field'},h('label',null,'Language'),h('select',{value:shareLanguage,onChange:e=>setShareLanguage(e.target.value)},['English','Tamil'].map(x=>h('option',{key:x,value:x},x)))),
            h('div',{className:'field span-2'},h('label',null,'Patient WhatsApp'),h('input',{value:patientPhone(selectedPatient())||'',readOnly:true,placeholder:'Not available'})),
            h('div',{className:'field span-2'},h('label',null,`${relativeName(selectedPatient())} WhatsApp`),h('input',{value:relativePhone(selectedPatient())||'',readOnly:true,placeholder:'Not available'}))
          ),
          shareType==='Quick Health Update'&&h('div',{className:'card panel',style:{marginTop:'12px'}},
            h('h4',null,'Quick Health Update Preview'),
            h('pre',{style:{whiteSpace:'pre-wrap',fontFamily:'inherit',margin:0,lineHeight:'1.55'}},quickHealthSummary(shareLanguage))
          ),
          h('div',{className:'message'},shareType==='Full Intelligent Report'?'Save the report as PDF first. WhatsApp will open with the prepared message; attach the PDF manually before sending.':'The quick health update has been generated from the selected patient report. Please review it before opening WhatsApp.'),
          h('div',{className:'actions'},h('button',{type:'button',className:'btn btn-secondary',onClick:()=>setShareOpen(false)},'Cancel'),h('button',{type:'button',className:'btn btn-whatsapp',disabled:shareBusy,onClick:openWhatsAppShare},shareBusy?'Opening WhatsApp…':'Open WhatsApp'))
        )
      )
    );
  }
function Reports(){const [data,setData]=React.useState({patients:[],billing:[],incidents:[]});React.useEffect(()=>{Promise.all([client.from('patients').select('*'),client.from('billing_transactions').select('*'),client.from('incidents').select('*')]).then(([a,b,c])=>setData({patients:a.data||[],billing:b.data||[],incidents:c.data||[]}))},[]);const active=data.patients.filter(x=>x.is_active).length,high=data.patients.filter(p=>p.fall_risk||p.pressure_sore_risk||p.aspiration_risk||p.oxygen_required).length,charges=data.billing.filter(x=>x.transaction_type==='Charge').reduce((a,x)=>a+Number(x.amount||0),0),payments=data.billing.filter(x=>x.transaction_type==='Payment').reduce((a,x)=>a+Number(x.amount||0),0);return h(React.Fragment,null,h('div',{className:'grid stats'},[['Active patients',active],['High-risk patients',high],['Open incidents',data.incidents.filter(x=>x.status==='Open').length],['Total billing',`₹${charges.toLocaleString('en-IN')}`],['Collections',`₹${payments.toLocaleString('en-IN')}`],['Outstanding',`₹${(charges-payments).toLocaleString('en-IN')}`]].map(([a,b])=>h('div',{className:'card stat',key:a},h('span',null,a),h('strong',null,b)))),h(Section,{title:'Management Reports',subtitle:'Live summary from the unified production database'},h('p',null,'Use browser Print to save this report as PDF. Detailed Excel/PDF exports can be added in the next release.')))}

  function Notifications({profile}){const [rows,setRows]=React.useState([]),[title,setTitle]=React.useState(''),[message,setMessage]=React.useState('');async function load(){const {data}=await client.from('notifications').select('*').order('created_at',{ascending:false}).limit(100);setRows(data||[])}React.useEffect(()=>{load()},[]);async function save(e){e.preventDefault();const {error}=await client.from('notifications').insert({title,message,priority:'Normal',created_by:profile.id});if(error)return alert(error.message);setTitle('');setMessage('');load()}return h(React.Fragment,null,['Admin','Manager'].includes(profile.role)&&h(Section,{title:'Create Notification'},h('form',{className:'modal-grid',onSubmit:save},miniInput('Title',title,setTitle,true),miniInput('Message',message,setMessage,true),h('button',{className:'btn btn-primary'},'Publish'))),h(LogTable,{title:'Notifications',heads:['Title','Message','Priority','Date'],rows:rows.map(r=>[r.title,r.message,r.priority,fmt(r.created_at)])}))}

  function AuditTrail(){
    const [rows,setRows]=React.useState([]);
    const [profiles,setProfiles]=React.useState([]);
    const [loading,setLoading]=React.useState(true);
    const [message,setMessage]=React.useState('');
    const [fromDate,setFromDate]=React.useState('');
    const [toDate,setToDate]=React.useState('');
    const [entityFilter,setEntityFilter]=React.useState('All');
    const [resultFilter,setResultFilter]=React.useState('All');
    const [userFilter,setUserFilter]=React.useState('All');
    const [search,setSearch]=React.useState('');

    async function load(){
      setLoading(true);setMessage('');
      const [logs,users]=await Promise.all([
        client.from('audit_log').select('*').order('created_at',{ascending:false}).limit(2000),
        client.from('profiles').select('id,auth_user_id,title,full_name,login_id,role')
      ]);
      if(logs.error)setMessage(logs.error.message||'Unable to load audit trail.');
      setRows(logs.data||[]);setProfiles(users.data||[]);setLoading(false);
    }
    React.useEffect(()=>{load();const ch=client.channel('audit-trail-live').on('postgres_changes',{event:'INSERT',schema:'public',table:'audit_log'},load).subscribe();return()=>client.removeChannel(ch)},[]);

    const profileFor=id=>profiles.find(p=>p.id===id||p.auth_user_id===id)||null;
    const userName=row=>{const p=profileFor(row.user_id);return p?`${formalName(p)} · ${p.role}`:(row.user_name||row.user_id||'System');};
    const dateOnly=value=>String(value||'').slice(0,10);
    const entities=[...new Set(rows.map(r=>r.entity).filter(Boolean))].sort();
    const users=[...new Set(rows.map(r=>r.user_id).filter(Boolean))];
    const filtered=rows.filter(r=>{
      const date=dateOnly(r.created_at);
      const text=[r.action,r.entity,r.entity_id,r.result,r.user_name,JSON.stringify(r.details||{}),JSON.stringify(r.new_data||{})].join(' ').toLowerCase();
      return (!fromDate||date>=fromDate)&&(!toDate||date<=toDate)&&
        (entityFilter==='All'||r.entity===entityFilter)&&
        (resultFilter==='All'||String(r.result||'Success')===resultFilter)&&
        (userFilter==='All'||String(r.user_id||'')===userFilter)&&
        (!search.trim()||text.includes(search.trim().toLowerCase()));
    });

    function detailSummary(row){
      const d=row.details||{};
      if(d.summary)return d.summary;
      if(d.login_id)return `Login ID: ${d.login_id}`;
      const changed=row.old_data&&row.new_data?Object.keys(row.new_data).filter(k=>JSON.stringify(row.old_data?.[k])!==JSON.stringify(row.new_data?.[k])).filter(k=>!['updated_at'].includes(k)).slice(0,8):[];
      if(changed.length)return `Changed: ${changed.join(', ')}`;
      return row.entity_id?`Record: ${row.entity_id}`:'—';
    }

    function exportCsv(){
      const headers=['Date & Time','User','Role','Action','Module / Entity','Record','Result','Details'];
      const lines=[headers,...filtered.map(r=>{
        const p=profileFor(r.user_id);
        return [fmt(r.created_at),p?formalName(p):(r.user_name||r.user_id||'System'),p?.role||r.user_role||'—',r.action||'—',r.entity||'—',r.entity_id||'—',r.result||'Success',detailSummary(r)];
      })].map(row=>row.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');
      const blob=new Blob([lines],{type:'text/csv;charset=utf-8'});
      const url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download=`Samara_Audit_Trail_${todayISOIndia()}.csv`;a.click();URL.revokeObjectURL(url);
    }

    return h(React.Fragment,null,
      h(Section,{title:'Audit Trail',subtitle:'Admin-only record of system activity, clinical entries and data changes'},
        message&&h('div',{className:'message error'},message),
        h('div',{className:'modal-grid'},
          h('div',{className:'field'},h('label',null,'From date'),h('input',{type:'date',value:fromDate,max:todayISOIndia(),onChange:e=>setFromDate(e.target.value)})),
          h('div',{className:'field'},h('label',null,'To date'),h('input',{type:'date',value:toDate,max:todayISOIndia(),onChange:e=>setToDate(e.target.value)})),
          h('div',{className:'field'},h('label',null,'Module'),h('select',{value:entityFilter,onChange:e=>setEntityFilter(e.target.value)},h('option',{value:'All'},'All modules'),entities.map(x=>h('option',{key:x,value:x},x)))),
          h('div',{className:'field'},h('label',null,'User'),h('select',{value:userFilter,onChange:e=>setUserFilter(e.target.value)},h('option',{value:'All'},'All users'),users.map(id=>h('option',{key:id,value:id},userName({user_id:id}))))),
          h('div',{className:'field'},h('label',null,'Result'),h('select',{value:resultFilter,onChange:e=>setResultFilter(e.target.value)},['All','Success','Failed'].map(x=>h('option',{key:x,value:x},x)))),
          h('div',{className:'field'},h('label',null,'Search'),h('input',{value:search,onChange:e=>setSearch(e.target.value),placeholder:'Action, record or details'})),
          h('button',{type:'button',className:'btn btn-secondary',onClick:load},loading?'Loading…':'Refresh'),
          h('button',{type:'button',className:'btn btn-secondary',onClick:exportCsv,disabled:!filtered.length},'Export Excel / CSV')
        )
      ),
      h(Section,{title:`Audit Records (${filtered.length})`,subtitle:'Latest records appear first'},
        h('div',{className:'table-wrap'},h('table',{className:'table'},
          h('thead',null,h('tr',null,['Date & Time','User','Action','Module','Record','Result','Details'].map(x=>h('th',{key:x},x)))),
          h('tbody',null,
            filtered.map(r=>h('tr',{key:r.id},
              h('td',null,fmt(r.created_at)),
              h('td',null,userName(r)),
              h('td',null,r.action||'—'),
              h('td',null,r.entity||'—'),
              h('td',null,r.entity_id||'—'),
              h('td',null,h('span',{className:`badge ${String(r.result||'Success')==='Failed'?'off':''}`},r.result||'Success')),
              h('td',null,detailSummary(r))
            )),
            !filtered.length?h('tr',null,h('td',{colSpan:7,className:'empty'},loading?'Loading audit records…':'No audit records match the selected filters.')):null
          )
        ))
      )
    );
  }

  function LogTable({title,subtitle,heads,rows}){
    return h(Section,{title,subtitle},
      h('div',{className:'table-wrap'},
        h('table',{className:'table'},
          h('thead',null,h('tr',null,heads.map(x=>h('th',{key:x},x)))),
          h('tbody',null,
            ...rows.map((r,i)=>h('tr',{key:i},...r.map((v,j)=>h('td',{key:j},v)))),
            rows.length===0?h('tr',null,h('td',{colSpan:heads.length,className:'empty'},'No records found')):null
          )
        )
      )
    );
  }

  function textareaSimple(label,value,onChange){return h('div',{className:'field'},h('label',null,label),h('textarea',{className:'textarea',value,onChange:e=>onChange(e.target.value)}))}
  function num(v){return v===''||v==null?null:Number(v)}

  function textareaField(label,key,form,setForm,cls=''){return h('div',{className:`field ${cls}`,key},h('label',null,label),h('textarea',{className:'textarea',value:form[key]||'',onChange:e=>setForm({...form,[key]:e.target.value})}))}
  function miniInput(label,value,onChange,required=false,type='text'){return h('div',{className:'field'},h('label',null,label),h('input',{type,value:value||'',required,onChange:e=>onChange(e.target.value)}))}
  function miniSelect(label,value,options,onChange){return h('div',{className:'field'},h('label',null,label),h('select',{value,onChange:e=>onChange(e.target.value)},options.map(x=>h('option',{key:x,value:x},x))))}

  function field(label,key,form,setForm,required,type='text'){const inputProps={type,value:form[key],required,onChange:e=>setForm({...form,[key]:e.target.value})};if(type==='date'&&key==='admission_date')inputProps.max=todayISOIndia();return h('div',{className:'field',key},h('label',null,label),h('input',inputProps))}
  function selectField(label,key,form,setForm,options){return h('div',{className:'field',key},h('label',null,label),h('select',{value:form[key],onChange:e=>setForm({...form,[key]:e.target.value})},options.map(x=>h('option',{key:x,value:x},x))))}

  ReactDOM.createRoot(document.getElementById('root')).render(h(App));
})();
