(() => {
  'use strict';
  const h = React.createElement;
  const cfg = window.SAMARA_CONFIG;
  const sdk = window.supabase;
  if (!cfg || !sdk) {
    document.getElementById('root').innerHTML = '<div class="loading">Unable to load application libraries.</div>';
    return;
  }
  const client = sdk.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const ROLES = ['Admin','Manager','Nurse','Caregiver','Accounts','Kitchen'];
  const NAV_SECTIONS = [
    { title:'OVERVIEW', items:['Dashboard','Notifications'] },
    { title:'ADMIN', items:['Employees','Audit Trail'] },
    { title:'ADMISSION', items:['Enquiries','Admissions','Patients','Documents'] },
    { title:'MANAGER', items:['Reports','Recovery Timeline'] },
    { title:'NURSING', items:['Shift Tasks','Daily Care','Vital Signs','Medicines','Physiotherapy','Shift Handover'] },
    { title:'OPERATIONS', items:['Rooms & Beds','Incidents'] },
    { title:'FOOD & DIET', items:['Food & Diet'] },
    { title:'ACCOUNTS / BILLING', items:['Billing & Payments'] }
  ];
  const ALL_NAV = NAV_SECTIONS.flatMap(section=>section.items);
  const ROLE_NAV={
    Admin:ALL_NAV,
    Manager:ALL_NAV,
    Nurse:['Notifications','Patients','Documents','Shift Tasks','Daily Care','Vital Signs','Medicines','Physiotherapy','Shift Handover','Rooms & Beds','Incidents','Recovery Timeline'],
    Caregiver:['Notifications','Patients','Shift Tasks','Daily Care','Shift Handover','Rooms & Beds','Incidents','Food & Diet','Recovery Timeline'],
    Accounts:['Notifications','Patients','Rooms & Beds','Billing & Payments','Reports'],
    Kitchen:['Notifications','Patients','Food & Diet']
  };
  const ROLE_HOME={Admin:'Dashboard',Manager:'Dashboard',Nurse:'Shift Tasks',Caregiver:'Shift Tasks',Accounts:'Billing & Payments',Kitchen:'Food & Diet'};
  const sectionsFor = allowed => NAV_SECTIONS
    .map(section=>({...section,items:section.items.filter(item=>allowed.includes(item))}))
    .filter(section=>section.items.length);
  const normalizeLogin = value => value.trim().toLowerCase().replace(/[^a-z0-9._-]/g,'');
  const loginEmail = value => `${normalizeLogin(value)}@${cfg.employeeEmailDomain}`;
  const fmt = value => value ? new Date(value).toLocaleString() : '—';
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[ch]));
  const whatsappNumber = value => { const digits=String(value||'').replace(/\D/g,''); if(!digits)return ''; if(digits.length===10)return `91${digits}`; if(digits.length===11&&digits.startsWith('0'))return `91${digits.slice(1)}`; return digits; };
  const whatsappWelcomeUrl = row => { const number=whatsappNumber(row.mobile); if(!number)return ''; const text=`Welcome to Samara Health Care LLP, ${row.full_name}. Your Samara Care employee account has been created. Login ID: ${row.login_id}. Please keep your password confidential. We are pleased to have you with us.`; return `https://wa.me/${number}?text=${encodeURIComponent(text)}`; };


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

  function App(){
    const [session,setSession]=React.useState(null);
    const [profile,setProfile]=React.useState(null);
    const [loading,setLoading]=React.useState(true);
    const [page,setPage]=React.useState('Dashboard');
    const [authMessage,setAuthMessage]=React.useState('');

    React.useEffect(()=>{
      client.auth.getSession().then(({data})=>setSession(data.session||null)).finally(()=>setLoading(false));
      const {data:{subscription}}=client.auth.onAuthStateChange((_event,next)=>setSession(next));
      if('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
      return()=>subscription.unsubscribe();
    },[]);

    React.useEffect(()=>{
      if(!session){setProfile(null);return;}
      client.from('profiles').select('*').or(`id.eq.${session.user.id},auth_user_id.eq.${session.user.id}`).maybeSingle().then(async({data,error})=>{
        if(error) console.error(error);
        if(!data){
          setAuthMessage('Your employee profile is not available. Please contact the Administrator.');
          await client.auth.signOut();
          return;
        }
        if(!data.is_active){
          setAuthMessage('This employee account is inactive. Please contact the Administrator.');
          await client.auth.signOut();
          return;
        }
        setProfile(data);
        setPage(ROLE_HOME[data.role]||'Notifications');
        client.from('profiles').update({last_sign_in_at:new Date().toISOString()}).eq('id',data.id).then(()=>{});
      });
    },[session]);

    if(loading) return h('div',{className:'loading'},'Loading Samara Care…');
    if(!session) return h(Login,{externalMessage:authMessage,onClearMessage:()=>setAuthMessage('')});
    if(!profile) return h('div',{className:'loading'},'Loading your employee profile…');

    const allowed = ROLE_NAV[profile.role]||['Dashboard'];
    if(!allowed.includes(page)) setTimeout(()=>setPage(ROLE_HOME[profile.role]||allowed[0]||'Notifications'),0);
    return h('div',{className:'app'},
      h(Sidebar,{profile,page,setPage,allowed}),
      h('main',{className:'main'},
        h('header',{className:'topbar'},h('h2',null,page),h('span',{className:'badge'},profile.role)),
        h(MobileMenu,{page,setPage,allowed}),
        h('section',{className:'content'},
          page==='Dashboard'&&h(Dashboard,{profile,onNavigate:setPage}),
          page==='Employees'&&h(Employees,{profile}),
          page==='Enquiries'&&h(Enquiries,{profile}),
          page==='Admissions'&&h(Admissions,{profile}),
          page==='Shift Tasks'&&h(ShiftTasks,{profile}),
          page==='Patients'&&h(Patients),
          page==='Rooms & Beds'&&h(RoomsBeds),
          page==='Daily Care'&&h(DailyCare,{profile}),
          page==='Vital Signs'&&h(VitalSigns,{profile}),
          page==='Medicines'&&h(Medicines,{profile}),
          page==='Food & Diet'&&h(FoodDiet,{profile}),
          page==='Physiotherapy'&&h(Physiotherapy,{profile}),
          page==='Shift Handover'&&h(ShiftHandover,{profile}),
          page==='Incidents'&&h(Incidents,{profile}),
          page==='Documents'&&h(Documents,{profile}),
          page==='Billing & Payments'&&h(BillingPayments,{profile}),
          page==='Recovery Timeline'&&h(RecoveryTimeline,{profile}),
          page==='Reports'&&h(Reports),
          page==='Notifications'&&h(Notifications,{profile}),
          page==='Audit Trail'&&h(AuditTrail)
        )
      )
    );
  }

  function Login({externalMessage,onClearMessage}){
    const [login,setLogin]=React.useState('');
    const [password,setPassword]=React.useState('');
    const [busy,setBusy]=React.useState(false);
    const [message,setMessage]=React.useState(externalMessage||'');
    React.useEffect(()=>{if(externalMessage)setMessage(externalMessage)},[externalMessage]);
    async function submit(e){
      e.preventDefault();setBusy(true);setMessage('');if(onClearMessage)onClearMessage();
      let email='';
      if(login.includes('@')){
        email=login.trim().toLowerCase();
      }else{
        const normalized=normalizeLogin(login);
        const {data:resolved,error:resolveError}=await client.rpc('resolve_employee_login',{p_login_id:normalized});
        if(resolveError){
          setMessage('Unable to verify the Login ID. Please contact the Administrator.');
          setBusy(false);
          return;
        }
        email=String(resolved||'').trim().toLowerCase();
        if(!email){
          setMessage('Incorrect Login ID or password.');
          setBusy(false);
          return;
        }
      }
      const {error}=await client.auth.signInWithPassword({email,password});
      if(error)setMessage(error.message==='Invalid login credentials'?'Incorrect Login ID or password.':error.message);
      setBusy(false);
    }
    return h('div',{className:'login-shell'},h('form',{className:'card login-card',onSubmit:submit},
      h('div',{className:'brand'},h('div',{className:'logo'},'SC'),h('div',null,h('h1',null,'Samara Care'),h('p',null,'Assisted Living Management System'))),
      message&&h('div',{className:'message error'},message),
      h('div',{className:'field'},h('label',null,'Login ID'),h('input',{value:login,onChange:e=>setLogin(e.target.value),required:true,autoCapitalize:'none'})),
      h('div',{className:'field'},h('label',null,'Password'),h('input',{type:'password',value:password,onChange:e=>setPassword(e.target.value),required:true})),
      h('button',{className:'btn btn-primary full',disabled:busy},busy?'Signing in…':'Sign in'),
      h('div',{className:'install-note'},'Installable on iPhone and Android after opening from GitHub Pages.')
    ));
  }

  function Sidebar({profile,page,setPage,allowed}){
    const sections=sectionsFor(allowed);
    const activeSection=sections.find(section=>section.items.includes(page))?.title||sections[0]?.title||'';
    const [openSection,setOpenSection]=React.useState(activeSection);
    React.useEffect(()=>{
      const next=sections.find(section=>section.items.includes(page))?.title;
      if(next)setOpenSection(next);
    },[page,allowed.join('|')]);
    function toggle(title){setOpenSection(current=>current===title?'':title)}
    return h('aside',{className:'sidebar'},
      h('div',{className:'side-brand'},h('div',{className:'side-logo'},'SC'),h('div',null,h('strong',null,'Samara Care'),h('small',null,'Assisted Living ERP V7'))),
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
          },item)))
        );
      })),
      h('div',{className:'sidebar-footer'},h('div',{className:'user-chip'},h('strong',null,profile.full_name),h('small',null,`${profile.login_id} · ${profile.role}`)),h('button',{className:'btn btn-secondary full',onClick:()=>client.auth.signOut()},'Sign out'))
    );
  }

  function MobileMenu({page,setPage,allowed}){
    const sections=sectionsFor(allowed);
    return h('div',{className:'mobile-menu'},
      h('label',null,'Module'),
      h('select',{value:page,onChange:e=>setPage(e.target.value)},
        sections.map(section=>h('optgroup',{label:section.title,key:section.title},section.items.map(item=>h('option',{value:item,key:item},item))))
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
      h('div',{className:'shift-summary'},h('div',null,h('strong',null,currentShift()),h('span',null,'Admin and Manager control dashboard')),h('span',{className:'badge'},profile.full_name)),
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
    const [idFiles,setIdFiles]=React.useState([]),[qualificationFiles,setQualificationFiles]=React.useState([]),[experienceFiles,setExperienceFiles]=React.useState([]),[otherFiles,setOtherFiles]=React.useState([]),[cameraFiles,setCameraFiles]=React.useState([]),[photoFiles,setPhotoFiles]=React.useState([]),[welcomeLink,setWelcomeLink]=React.useState('');
    const [cameraConfig,setCameraConfig]=React.useState(null);
    const empty={full_name:'',employee_id:'',designation:'',mobile:'',emergency_contact:'',role:'Caregiver',login_id:'',employee_email:'',password:'',father_guardian_name:'',address:'',date_of_birth:'',date_of_joining:'',blood_group:'',id_card_type:'Aadhaar',id_card_number:'',qualification:'',previous_workplace:'',reference_type:'Direct',reference_name:'',reference_contact:''};
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

    async function uploadEmployeeFiles(userId,groups){
      for(const group of groups){
        for(const file of group.files||[]){
          const safe=String(file.name||'document').replace(/[^a-zA-Z0-9._-]/g,'_');
          const path=`${userId}/${Date.now()}-${Math.random().toString(36).slice(2,8)}-${safe}`;
          const {error:uploadError}=await client.storage.from('employee-documents').upload(path,file,{upsert:false,contentType:file.type||undefined});
          if(uploadError)throw new Error(`Unable to upload ${file.name}: ${uploadError.message}`);
          const {error:docError}=await client.from('employee_documents').insert({employee_id:userId,document_type:group.type,file_name:file.name,storage_path:path,mime_type:file.type||null,file_size:file.size||null,uploaded_by:profile.id});
          if(docError)throw new Error(`Document record could not be saved: ${docError.message}`);
        }
      }
    }

    async function uploadEmployeePhoto(userId,files){
      const file=(files||[])[0];
      if(!file)return null;
      const safe=String(file.name||'employee-photo.jpg').replace(/[^a-zA-Z0-9._-]/g,'_');
      const path=`${userId}/profile-${Date.now()}-${safe}`;
      const {error:uploadError}=await client.storage.from('employee-documents').upload(path,file,{upsert:true,contentType:file.type||'image/jpeg'});
      if(uploadError)throw new Error(`Unable to upload employee photo: ${uploadError.message}`);
      const {error:profileError}=await client.from('profiles').update({photo_storage_path:path}).eq('id',userId);
      if(profileError)throw new Error(`Employee photo could not be linked: ${profileError.message}`);
      const {error:docError}=await client.from('employee_documents').insert({employee_id:userId,document_type:'Employee Photo',file_name:file.name||'Employee Photo',storage_path:path,mime_type:file.type||null,file_size:file.size||null,uploaded_by:profile.id});
      if(docError)throw new Error(`Employee photo record could not be saved: ${docError.message}`);
      return path;
    }

    async function create(e){
      e.preventDefault();setBusy(true);setMsg('');setWelcomeLink('');
      const preopened=form.mobile?window.open('about:blank','_blank'):null;
      try{
        const result=await adminRequest({action:'create_or_repair',...form});
        await uploadEmployeePhoto(result.user_id,photoFiles);
        await uploadEmployeeFiles(result.user_id,[
          {type:'ID Card',files:idFiles},{type:'Qualification Certificate',files:qualificationFiles},{type:'Experience Certificate',files:experienceFiles},{type:'Other Certificate',files:otherFiles},{type:'Camera Capture',files:cameraFiles}
        ]);
        const createdRow={...form,id:result.user_id};
        const link=whatsappWelcomeUrl(createdRow);setWelcomeLink(link);
        if(preopened&&link){preopened.location.href=link}else if(preopened){preopened.close()}
        await load();
        setMsg(result.repaired?'Employee account repaired and personnel details saved successfully.':'Employee created successfully with personnel details. The employee can sign in immediately.');
        setForm(empty);setIdFiles([]);setQualificationFiles([]);setExperienceFiles([]);setOtherFiles([]);setCameraFiles([]);setPhotoFiles([]);
      }catch(error){if(preopened)preopened.close();setMsg(error.message||'Unable to create employee')}
      setBusy(false);
    }

    async function toggle(row){try{await adminRequest({action:'toggle',user_id:row.id,is_active:!(row.is_active??row.active)});await load()}catch(error){alert(error.message||'Unable to update employee')}}
    function openReset(row){setResetTarget(row);setNewPassword('');setConfirmPassword('');setResetMsg('')}
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
      const {data,error}=await client.from('employee_documents').select('*').eq('employee_id',row.id).order('created_at',{ascending:false});
      if(error)setDetailsMsg(error.message);else setDetailsDocs(data||[]);
    }
    async function saveDetails(e){
      e.preventDefault();setDetailsBusy(true);setDetailsMsg('');
      try{
        const payload={...detailsForm};delete payload.password;delete payload.id;delete payload.created_at;delete payload.updated_at;delete payload.last_sign_in_at;
        const {error}=await client.from('profiles').update(payload).eq('id',detailsTarget.id);if(error)throw error;
        await uploadEmployeePhoto(detailsTarget.id,photoFiles);
        await uploadEmployeeFiles(detailsTarget.id,[{type:'ID Card',files:idFiles},{type:'Qualification Certificate',files:qualificationFiles},{type:'Experience Certificate',files:experienceFiles},{type:'Other Certificate',files:otherFiles},{type:'Camera Capture',files:cameraFiles}]);
        setDetailsMsg('Employee information and documents updated successfully.');setIdFiles([]);setQualificationFiles([]);setExperienceFiles([]);setOtherFiles([]);setCameraFiles([]);setPhotoFiles([]);await load();
        const {data}=await client.from('employee_documents').select('*').eq('employee_id',detailsTarget.id).order('created_at',{ascending:false});setDetailsDocs(data||[]);
      }catch(error){setDetailsMsg(error.message||'Unable to update employee')}
      setDetailsBusy(false);
    }
    async function openDocument(doc){
      const {data,error}=await client.storage.from('employee-documents').createSignedUrl(doc.storage_path,120);
      if(error){alert(error.message);return}window.open(data.signedUrl,'_blank','noopener');
    }

    async function printIdCard(row){
      let photoUrl='';
      if(row.photo_storage_path){const {data}=await client.storage.from('employee-documents').createSignedUrl(row.photo_storage_path,300);photoUrl=data?.signedUrl||''}
      const win=window.open('','_blank','width=760,height=700');
      if(!win){alert('Please allow pop-ups to print the ID card.');return}
      const validUntil=row.date_of_joining?new Date(new Date(row.date_of_joining).setFullYear(new Date(row.date_of_joining).getFullYear()+3)).toLocaleDateString('en-IN'):'As per employment';
      win.document.write(`<!doctype html><html><head><title>Employee ID Card</title><style>body{font-family:Arial;margin:0;padding:30px;background:#eef6f4}.card{width:360px;height:570px;margin:auto;background:white;border-radius:24px;overflow:hidden;box-shadow:0 12px 35px #0002;border:2px solid #086b58}.head{background:#086b58;color:white;text-align:center;padding:22px}.head h1{margin:0;font-size:25px}.head p{margin:6px 0 0}.photo{width:130px;height:150px;border:4px solid white;border-radius:16px;object-fit:cover;background:#ddd;margin:-4px auto 16px;display:block;box-shadow:0 4px 15px #0003}.body{padding:16px 28px;text-align:center}.name{font-size:25px;font-weight:bold;color:#063f36}.role{font-size:18px;color:#086b58;margin:5px}.grid{text-align:left;margin-top:18px;line-height:1.75}.label{font-weight:bold;color:#555}.foot{position:absolute}.barcode{margin-top:15px;padding:10px;border-top:1px dashed #aaa;font-family:monospace}.print{display:block;margin:20px auto;padding:12px 24px}@media print{.print{display:none}body{background:white;padding:0}}</style></head><body><div class="card"><div class="head"><h1>SAMARA HEALTH CARE LLP</h1><p>Assisted Living Management System</p></div><div class="body">${photoUrl?`<img class="photo" src="${photoUrl}">`:`<div class="photo" style="display:flex;align-items:center;justify-content:center;font-size:48px">SC</div>`}<div class="name">${escapeHtml(row.full_name)}</div><div class="role">${escapeHtml(row.designation||row.role)}</div><div class="grid"><div><span class="label">Employee ID:</span> ${escapeHtml(row.employee_id||'—')}</div><div><span class="label">Role:</span> ${escapeHtml(row.role||'—')}</div><div><span class="label">Mobile:</span> ${escapeHtml(row.mobile||'—')}</div><div><span class="label">Blood Group:</span> ${escapeHtml(row.blood_group||'—')}</div><div><span class="label">Date of Joining:</span> ${escapeHtml(row.date_of_joining||'—')}</div><div><span class="label">Valid:</span> ${escapeHtml(validUntil)}</div></div><div class="barcode">${escapeHtml(row.login_id||row.id)}</div></div></div><button class="print" onclick="window.print()">Print ID Card</button></body></html>`);
      win.document.close();
    }

    function authenticationStatus(row){const auth=authMap[row.auth_user_id||row.id];if(!auth)return {text:'Auth user missing',className:'off'};if(auth.banned)return {text:'Blocked',className:'off'};if(!auth.confirmed)return {text:'Unconfirmed',className:'warn'};return {text:'Connected',className:'on'}}
    const fileInput=(label,setter,accept='application/pdf,image/*',isPhoto=false)=>h('div',{className:'field capture-field'},
      h('label',null,label),
      h('div',{className:'capture-actions'},
        h('label',{className:'btn btn-secondary file-button'},'Upload File',h('input',{type:'file',multiple:!isPhoto,accept,onChange:e=>setter(Array.from(e.target.files||[]))})),
        h('label',{className:'btn btn-secondary file-button'},'Mobile Camera',h('input',{type:'file',multiple:!isPhoto,accept:'image/*',capture:isPhoto?'user':'environment',onChange:e=>setter(prev=>[...(isPhoto?[]:prev),...Array.from(e.target.files||[])])})),
        h('button',{type:'button',className:'btn btn-secondary',onClick:()=>setCameraConfig({title:label,facingMode:isPhoto?'user':'environment',filePrefix:isPhoto?'employee-photo':'document',onCapture:file=>setter(prev=>isPhoto?[file]:[...prev,file])})},'Webcam')
      ),
      h('small',null,'Choose an existing file, use the mobile camera, or open the live webcam capture.'),
      h('div',{className:'selected-files'},isPhoto?(photoFiles[0]?`Selected: ${photoFiles[0].name}`:'No photo selected'):null)
    );
    const textArea=(label,key,state,setter,required=false)=>h('div',{className:'field span-2'},h('label',null,label),h('textarea',{value:state[key]||'',required,onChange:e=>setter({...state,[key]:e.target.value}),rows:3}));

    const table=h('div',{className:'table-wrap'},h('table',{className:'table'},
      h('thead',null,h('tr',null,['Name','Employee ID','Login ID','Role','Profile Status','Authentication Status','Last sign-in','Actions'].map(x=>h('th',{key:x},x)))),
      h('tbody',null,rows.map(r=>{const enabled=Boolean(r.is_active??r.active),auth=authMap[r.auth_user_id||r.id],status=authenticationStatus(r),managerBlocked=profile.role==='Manager'&&String(r.role).toLowerCase()==='admin';return h('tr',{key:r.id},
        h('td',null,r.full_name),h('td',null,r.employee_id||'—'),h('td',null,r.login_id),h('td',null,r.role),
        h('td',null,h('span',{className:`badge ${enabled?'':'off'}`},enabled?'Active':'Disabled')),
        h('td',null,h('span',{className:`badge auth-status ${status.className}`},status.text)),h('td',null,fmt(auth?.last_sign_in_at||r.last_sign_in_at)),
        h('td',null,h('div',{className:'employee-actions'},h('button',{className:'btn btn-secondary',onClick:()=>openDetails(r)},'Personnel File'),h('button',{className:'btn btn-secondary',onClick:()=>openDetails(r)},'Documents'),h('button',{className:'btn btn-secondary',onClick:()=>printIdCard(r)},'Print ID Card'),r.mobile?h('a',{className:'btn btn-whatsapp',href:whatsappWelcomeUrl(r),target:'_blank',rel:'noopener'},'WhatsApp Welcome'):null,h('button',{className:enabled?'btn btn-danger':'btn btn-secondary',disabled:managerBlocked,onClick:()=>toggle(r)},enabled?'Disable':'Enable'),auth?h('button',{className:'btn btn-primary',disabled:managerBlocked,onClick:()=>openReset(r)},'Reset Password'):h('button',{className:'btn btn-warning',disabled:managerBlocked,onClick:()=>openRepair(r)},'Repair Account')))
      )}),rows.length===0?h('tr',null,h('td',{colSpan:8,className:'empty'},'No employees found')):null))
    );

    const personnelFields=(state,setter,includeLogin=true)=>h(React.Fragment,null,
      field('Employee Name','full_name',state,setter,true),field('Employee ID','employee_id',state,setter,true),field('Designation','designation',state,setter,false),selectField('Role','role',state,setter,ROLES),
      field('Father / Guardian Name','father_guardian_name',state,setter,false),field('Date of Birth','date_of_birth',state,setter,false,'date'),field('Date of Joining','date_of_joining',state,setter,false,'date'),field('Blood Group','blood_group',state,setter,false),
      field('Mobile Number','mobile',state,setter,false),field('Emergency Contact','emergency_contact',state,setter,false),field('Employee Email','employee_email',state,setter,false,'email'),
      field('ID Card Type','id_card_type',state,setter,false),field('ID Card Number','id_card_number',state,setter,false),field('Qualification','qualification',state,setter,false),field('Previous Working Place','previous_workplace',state,setter,false),
      selectField('Joining Source','reference_type',state,setter,['Direct','Reference']),field('Reference Name','reference_name',state,setter,false),field('Reference Contact','reference_contact',state,setter,false),
      includeLogin?field('Login ID','login_id',state,setter,true):null,includeLogin?field('Temporary Password','password',state,setter,true,'password'):null,textArea('Residential Address','address',state,setter,false)
    );

    const uploadFields=()=>h('div',{className:'employee-upload-section span-2'},h('h4',null,'Employee Photo, Documents and Certificates'),h('p',{className:'small-note'},'Each item provides separate Upload File, Mobile Camera and Webcam options.'),h('div',{className:'modal-grid'},fileInput('Employee Photo',setPhotoFiles,'image/*',true),fileInput('ID Card / Identity Proof',setIdFiles),fileInput('Qualification Certificates',setQualificationFiles),fileInput('Experience / Previous Employment Certificates',setExperienceFiles),fileInput('Other Certificates',setOtherFiles)));

    const createModal=show?h('div',{className:'modal-backdrop'},h('form',{className:'card modal employee-modal',onSubmit:create},
      h('div',{className:'panel-head'},h('div',null,h('h3',null,'Create Employee'),h('small',null,'Personnel details, login account and certificate uploads')),h('button',{type:'button',className:'close',onClick:()=>setShow(false)},'×')),
      msg?h('div',{className:`message ${msg.startsWith('Employee created')||msg.startsWith('Employee account repaired')?'success':'error'}`},msg):null,
      welcomeLink&&h('a',{className:'btn btn-whatsapp full',href:welcomeLink,target:'_blank',rel:'noopener'},'Send Welcome Message on WhatsApp'),
      h('div',{className:'modal-grid'},personnelFields(form,setForm,true),uploadFields()),h('p',{className:'message success'},'The login account is created and confirmed securely without sending an email.'),h('button',{className:'btn btn-primary full',disabled:busy},busy?'Creating employee and uploading documents…':'Create Employee')
    )):null;

    const detailsModal=detailsTarget&&detailsForm?h('div',{className:'modal-backdrop'},h('form',{className:'card modal employee-modal',onSubmit:saveDetails},
      h('div',{className:'panel-head'},h('div',null,h('h3',null,'Employee Personnel File'),h('small',null,`${detailsTarget.full_name} · ${detailsTarget.login_id}`)),h('button',{type:'button',className:'close',onClick:()=>setDetailsTarget(null)},'×')),
      detailsMsg&&h('div',{className:`message ${detailsMsg.startsWith('Employee information')?'success':'error'}`},detailsMsg),
      h('div',{className:'modal-grid'},personnelFields(detailsForm,setDetailsForm,false),uploadFields()),
      h('div',{className:'employee-doc-list'},h('h4',null,'Uploaded Documents'),detailsDocs.length?detailsDocs.map(d=>h('div',{className:'document-row',key:d.id},h('span',null,`${d.document_type}: ${d.file_name}`),h('button',{type:'button',className:'btn btn-secondary',onClick:()=>openDocument(d)},'Open'))):h('p',{className:'small-note'},'No documents uploaded yet.')),
      h('button',{className:'btn btn-primary full',disabled:detailsBusy},detailsBusy?'Saving…':'Save Employee Information')
    )):null;

    const resetModal=resetTarget?h('div',{className:'modal-backdrop'},h('form',{className:'card modal reset-password-modal',onSubmit:resetPassword},h('div',{className:'panel-head'},h('div',null,h('h3',null,'Reset Employee Password'),h('small',null,`${resetTarget.full_name} · ${resetTarget.login_id}`)),h('button',{type:'button',className:'close',onClick:()=>setResetTarget(null)},'×')),resetMsg&&h('div',{className:`message ${resetMsg.startsWith('Password reset')?'success':'error'}`},resetMsg),h('div',{className:'field'},h('label',null,'New password'),h('input',{type:'password',value:newPassword,onChange:e=>setNewPassword(e.target.value),minLength:8,required:true,autoComplete:'new-password'})),h('div',{className:'field'},h('label',null,'Confirm new password'),h('input',{type:'password',value:confirmPassword,onChange:e=>setConfirmPassword(e.target.value),minLength:8,required:true,autoComplete:'new-password'})),h('p',{className:'small-note'},'Resetting the password also enables and unblocks the employee account.'),h('button',{className:'btn btn-primary full',disabled:resetBusy},resetBusy?'Resetting…':'Reset Password & Enable Account'))):null;
    const repairModal=repairTarget?h('div',{className:'modal-backdrop'},h('form',{className:'card modal reset-password-modal',onSubmit:repairAccount},h('div',{className:'panel-head'},h('div',null,h('h3',null,'Repair Employee Account'),h('small',null,`${repairTarget.full_name} · ${repairTarget.login_id}`)),h('button',{type:'button',className:'close',onClick:()=>setRepairTarget(null)},'×')),repairMsg&&h('div',{className:`message ${repairMsg.startsWith('Authentication account repaired')?'success':'error'}`},repairMsg),h('p',null,'This employee has a profile but no matching Supabase Authentication account. Enter a temporary password to rebuild the login account.'),h('div',{className:'field'},h('label',null,'Temporary password'),h('input',{type:'password',value:repairPassword,onChange:e=>setRepairPassword(e.target.value),minLength:8,required:true,autoComplete:'new-password'})),h('button',{className:'btn btn-warning full',disabled:repairBusy},repairBusy?'Repairing…':'Repair Account & Enable Login'))):null;

    return h(React.Fragment,null,h('div',{className:'card panel'},h('div',{className:'panel-head'},h('div',null,h('h3',null,'Employees'),h('small',null,'Personnel records, documents, central login accounts and Authentication status')),h('button',{className:'btn btn-primary',onClick:()=>{setShow(true);setMsg('')}},'Create Employee')),msg&&!show?h('div',{className:'message error'},msg):null,table),createModal,detailsModal,resetModal,repairModal,cameraConfig?h(CameraCaptureModal,{config:cameraConfig,onClose:()=>setCameraConfig(null)}):null);
  }


  function Enquiries({profile}){
    const [rows,setRows]=React.useState([]),[form,setForm]=React.useState({patient_name:'',family_contact_name:'',family_contact_phone:'',current_location:'Home',reason_for_enquiry:'',expected_admission_date:'',bed_preference:'',special_requirements:'',source:'Direct',status:'New'});
    async function load(){const {data}=await client.from('pre_admission_enquiries').select('*').order('created_at',{ascending:false});setRows(data||[])}React.useEffect(()=>{load()},[]);
    async function save(e){e.preventDefault();const {error}=await client.from('pre_admission_enquiries').insert({...form,handled_by:profile.id});if(error)return alert(error.message);setForm({...form,patient_name:'',family_contact_name:'',family_contact_phone:'',reason_for_enquiry:'',special_requirements:''});load()}
    async function status(id,value){await client.from('pre_admission_enquiries').update({status:value,updated_at:new Date().toISOString()}).eq('id',id);load()}
    return h(React.Fragment,null,h(Section,{title:'Pre-Admission Enquiry',subtitle:'Track enquiries, assessments, estimates and bed reservations'},h('form',{className:'modal-grid',onSubmit:save},miniInput('Patient name',form.patient_name,v=>setForm({...form,patient_name:v}),true),miniInput('Family contact',form.family_contact_name,v=>setForm({...form,family_contact_name:v}),true),miniInput('Phone',form.family_contact_phone,v=>setForm({...form,family_contact_phone:v}),true,'tel'),miniSelect('Current location',form.current_location,['Home','Hospital','Clinic','Other Care Centre'],v=>setForm({...form,current_location:v})),miniSelect('Source',form.source,['Direct','Hospital','Doctor','Reference','Website','Other'],v=>setForm({...form,source:v})),miniInput('Expected admission',form.expected_admission_date,v=>setForm({...form,expected_admission_date:v}),false,'date'),miniInput('Bed preference',form.bed_preference,v=>setForm({...form,bed_preference:v})),miniInput('Reason for enquiry',form.reason_for_enquiry,v=>setForm({...form,reason_for_enquiry:v}),true),miniInput('Special requirements',form.special_requirements,v=>setForm({...form,special_requirements:v})),h('button',{className:'btn btn-primary'},'Save Enquiry'))),h(LogTable,{title:'Enquiry Register',heads:['Patient','Family Contact','Location','Expected Date','Status','Action'],rows:rows.map(r=>[r.patient_name,`${r.family_contact_name} · ${r.family_contact_phone}`,r.current_location,r.expected_admission_date||'—',r.status,h('select',{value:r.status,onChange:e=>status(r.id,e.target.value)},['New','Assessment Scheduled','Estimate Sent','Bed Reserved','Converted to Admission','Closed'].map(x=>h('option',{key:x},x)))])}))
  }

  function Admissions({profile}){
    const today=new Date().toISOString().slice(0,10);
    const initial={admission_type:'Hospital Discharge',patient_category:'Short Stay',full_name:'',age:'',gender:'Male',mobile:'',address:'',room_no:'',bed_no:'',admission_date:today,hospital_name:'',discharge_date:today,diagnosis:'',treating_doctor:'',doctor_phone:'',referring_doctor:'',referring_source:'',family_doctor:'',attendant_name:'',attendant_phone:'',allergies:'',special_instructions:'',diet_plan:'Normal diet',feeding_instruction:'',billing_package:'Standard Assisted Care',fall_risk:false,pressure_sore_risk:false,aspiration_risk:false,wandering_risk:false,infection_risk:false,seizure_history:false,oxygen_required:false,oxygen_instruction:'',dressing_required:false,dressing_instruction:'',special_nurse_required:false,special_nurse_name:'',special_nurse_shift:'Both shifts / 24-hour coverage',special_nurse_instructions:'',physio_required:false,therapy_type:'',physio_frequency:'Daily',physio_time:'10:00',physio_precautions:''};
    const [form,setForm]=React.useState(initial),[meds,setMeds]=React.useState([blankMedicine()]),[care,setCare]=React.useState([blankCare()]),[busy,setBusy]=React.useState(false),[msg,setMsg]=React.useState('');
    const [photoFiles,setPhotoFiles]=React.useState([]),[idFiles,setIdFiles]=React.useState([]),[dischargeFiles,setDischargeFiles]=React.useState([]),[prescriptionFiles,setPrescriptionFiles]=React.useState([]),[reportFiles,setReportFiles]=React.useState([]);
    const careTemplates=['Bathing assistance','Restroom/toileting assistance','Oral hygiene','Dressing assistance','Feeding assistance','Walking/mobility assistance','Diaper change','Position change / bedsore prevention','Fluid intake monitoring','Sleep assistance'];
    const riskItems=[['fall_risk','Fall risk'],['pressure_sore_risk','Pressure sore risk'],['aspiration_risk','Aspiration risk'],['wandering_risk','Wandering / confusion risk'],['infection_risk','Infection-control precautions'],['seizure_history','Seizure history']];
    const needsHospital=form.admission_type==='Hospital Discharge'||form.admission_type==='Hospital Transfer';
    const needsReferral=form.admission_type==='Doctor Referral';
    function updateRow(setter,rows,i,key,value){setter(rows.map((r,n)=>n===i?{...r,[key]:value}:r))}
    function addCareTemplate(name){if(care.some(x=>x.care_type===name))return;setCare([...care,{...blankCare(),care_type:name}])}
    async function uploadPatientFile(patientId,file,type,isPhoto=false){
      const safe=String(file.name||type).replace(/[^a-zA-Z0-9._-]/g,'_');
      const path=`${patientId}/${Date.now()}-${Math.random().toString(36).slice(2,8)}-${safe}`;
      const {error:up}=await client.storage.from('patient-documents').upload(path,file,{upsert:false,contentType:file.type||undefined});if(up)throw up;
      const {error:doc}=await client.from('patient_documents').insert({patient_id:patientId,document_type:type,document_name:file.name||type,storage_path:path,mime_type:file.type||null,file_size:file.size||null,uploaded_by:profile.id,is_verified:true});if(doc)throw doc;
      if(isPhoto){const {error:e}=await client.from('patients').update({photo_storage_path:path}).eq('id',patientId);if(e)throw e}
    }
    async function submit(e){
      e.preventDefault();setBusy(true);setMsg('');
      if(!photoFiles.length){setMsg('Capture or upload the patient photograph before admission.');setBusy(false);return}
      if(!idFiles.length){setMsg('Upload at least one patient identity document.');setBusy(false);return}
      if(needsHospital&&!dischargeFiles.length){setMsg('Upload the hospital discharge summary or transfer note.');setBusy(false);return}
      if((needsHospital||needsReferral)&&!prescriptionFiles.length){setMsg('Upload the current prescription.');setBusy(false);return}
      if(!meds.length||meds.some(m=>!m.medicine_name||!m.dose||!m.times)){setMsg('Enter every current medicine, dose and administration time.');setBusy(false);return}
      if(form.special_nurse_required&&!form.special_nurse_name){setMsg('Assign or enter the special nurse name.');setBusy(false);return}
      const {data:{user}}=await client.auth.getUser();
      const payload={...form,age:Number(form.age)||null,created_by:user.id,is_active:true,admission_status:'Active',prescription_verified:true,prescription_verified_by:user.id,prescription_verified_at:new Date().toISOString()};
      ['physio_required','therapy_type','physio_frequency','physio_time','physio_precautions'].forEach(k=>delete payload[k]);
      const {data:patient,error}=await client.from('patients').insert(payload).select().single();if(error){setMsg(error.message);setBusy(false);return}
      try{
        await uploadPatientFile(patient.id,photoFiles[0],'Patient Photo',true);
        for(const f of idFiles)await uploadPatientFile(patient.id,f,'Identity Proof');
        for(const f of dischargeFiles)await uploadPatientFile(patient.id,f,needsHospital?'Discharge / Transfer Summary':'Medical History');
        for(const f of prescriptionFiles)await uploadPatientFile(patient.id,f,'Current Prescription');
        for(const f of reportFiles)await uploadPatientFile(patient.id,f,'Medical / Test Report');
        const medRows=meds.map(m=>({patient_id:patient.id,medicine_name:m.medicine_name,strength:m.strength,dose:m.dose,route:m.route,food_instruction:m.food_instruction,special_instruction:m.special_instruction,scheduled_times:m.times.split(',').map(x=>x.trim()).filter(Boolean),entered_by:user.id,verified_by:user.id}));
        await client.from('medication_orders').insert(medRows);
        const careRows=care.filter(c=>c.care_type).map(c=>({...c,patient_id:patient.id,entered_by:user.id}));if(careRows.length)await client.from('care_orders').insert(careRows);
        if(form.physio_required&&form.therapy_type)await client.from('physiotherapy_orders').insert({patient_id:patient.id,advised_by:form.treating_doctor||form.referring_doctor,therapy_type:form.therapy_type,frequency:form.physio_frequency,preferred_time:form.physio_time,precautions:form.physio_precautions,start_date:form.admission_date,entered_by:user.id});
        await client.from('audit_log').insert({user_id:user.id,action:'PATIENT_ADMISSION_COMPLETED',entity:'patients',entity_id:patient.id,details:{admission_type:form.admission_type,category:form.patient_category}});
        setMsg('Admission completed. Patient photo, documents, medicines and care plan are active.');setForm(initial);setMeds([blankMedicine()]);setCare([blankCare()]);setPhotoFiles([]);setIdFiles([]);setDischargeFiles([]);setPrescriptionFiles([]);setReportFiles([]);
      }catch(err){setMsg('Patient created, but document or care setup failed: '+err.message)}
      setBusy(false);
    }
    return h('form',{className:'card panel',onSubmit:submit},
      h('div',{className:'panel-head'},h('div',null,h('h3',null,'Unified Patient Admission'),h('small',null,'Hospital discharge, direct admission, doctor referral or transfer'))),
      msg&&h('div',{className:`message ${msg.startsWith('Admission')?'success':'error'}`},msg),
      h('div',{className:'section-card'},h('h4',null,'1. Admission route and patient identity'),h('div',{className:'form-grid'},
        selectField('Admission type','admission_type',form,setForm,['Hospital Discharge','Direct Admission','Doctor Referral','Hospital Transfer']),
        selectField('Patient category','patient_category',form,setForm,['Short Stay','Respite Care','Post-Surgery','Rehabilitation','Stroke Recovery','Dementia Care','Parkinsonism','Palliative Care','Long-Term Assisted Living','Observation','Elderly Care']),
        field('Patient name','full_name',form,setForm,true),field('Age','age',form,setForm,false,'number'),selectField('Gender','gender',form,setForm,['Male','Female','Other']),field('Mobile','mobile',form,setForm,false,'tel'),textareaField('Address','address',form,setForm,'span-2'),field('Family / attendant name','attendant_name',form,setForm,true),field('Attendant phone','attendant_phone',form,setForm,true,'tel')
      ),h('div',{className:'upload-grid'},fileInput('Patient Photo (camera or upload)',photoFiles,setPhotoFiles,'image/*',true),fileInput('Identity Proof',idFiles,setIdFiles,'image/*,.pdf',true))),
      h('div',{className:'section-card'},h('h4',null,'2. Medical source and records'),h('div',{className:'form-grid'},
        needsHospital&&field('Hospital / previous centre','hospital_name',form,setForm,true),needsHospital&&field('Discharge / transfer date','discharge_date',form,setForm,true,'date'),
        needsReferral&&field('Referring doctor','referring_doctor',form,setForm,true),needsReferral&&field('Clinic / referral source','referring_source',form,setForm,false),
        form.admission_type==='Direct Admission'&&field('Family doctor','family_doctor',form,setForm,false),field('Diagnosis / current condition','diagnosis',form,setForm,true),field('Treating doctor','treating_doctor',form,setForm,false),field('Doctor contact','doctor_phone',form,setForm,false,'tel'),field('Known allergies','allergies',form,setForm,false),textareaField('Instructions / precautions','special_instructions',form,setForm,'span-2')
      ),h('div',{className:'upload-grid'},fileInput('Discharge / Transfer / Previous Medical Record',dischargeFiles,setDischargeFiles,'image/*,.pdf',false),fileInput('Current Prescription',prescriptionFiles,setPrescriptionFiles,'image/*,.pdf',false),fileInput('Lab, Scan and Other Reports',reportFiles,setReportFiles,'image/*,.pdf',false))),
      h('div',{className:'section-card'},h('div',{className:'section-title'},h('h4',null,'3. Current medicines and prescription verification'),h('button',{type:'button',className:'btn btn-secondary',onClick:()=>setMeds([...meds,blankMedicine()])},'Add medicine')),meds.map((m,i)=>h('div',{className:'repeat-row',key:i},miniInput('Medicine',m.medicine_name,v=>updateRow(setMeds,meds,i,'medicine_name',v),true),miniInput('Strength',m.strength,v=>updateRow(setMeds,meds,i,'strength',v)),miniInput('Dose',m.dose,v=>updateRow(setMeds,meds,i,'dose',v),true),miniSelect('Route',m.route,['Oral','Injection','Topical','Inhalation','Drops','Other'],v=>updateRow(setMeds,meds,i,'route',v)),miniSelect('Food',m.food_instruction,['Before food','After food','With food','No restriction'],v=>updateRow(setMeds,meds,i,'food_instruction',v)),miniInput('Times',m.times,v=>updateRow(setMeds,meds,i,'times',v),true),h('button',{type:'button',className:'icon-btn',onClick:()=>setMeds(meds.filter((_,n)=>n!==i)),disabled:meds.length===1},'Remove'),miniInput('Special instruction',m.special_instruction,v=>updateRow(setMeds,meds,i,'special_instruction',v))))),
      h('div',{className:'section-card'},h('h4',null,'4. Master care plan'),h('div',{className:'check-grid'},careTemplates.map(name=>h('label',{className:'check-card',key:name},h('input',{type:'checkbox',checked:care.some(x=>x.care_type===name),onChange:e=>e.target.checked?addCareTemplate(name):setCare(care.filter(x=>x.care_type!==name))}),h('span',null,name)))),care.map((c,i)=>h('div',{className:'repeat-row care',key:c.care_type+i},miniInput('Care task',c.care_type,v=>updateRow(setCare,care,i,'care_type',v),true),miniSelect('Shift',c.shift,['Day Shift (7 AM–7 PM)','Night Shift (7 PM–7 AM)','Both shifts'],v=>updateRow(setCare,care,i,'shift',v)),miniSelect('Frequency',c.frequency,['Daily','Each shift','Twice daily','As required'],v=>updateRow(setCare,care,i,'frequency',v)),miniInput('Instruction',c.instruction,v=>updateRow(setCare,care,i,'instruction',v)),h('button',{type:'button',className:'icon-btn',onClick:()=>setCare(care.filter((_,n)=>n!==i))},'Remove'))),h('div',{className:'form-grid'},selectField('Diet plan','diet_plan',form,setForm,['Normal diet','Soft diet','Liquid diet','Diabetic diet','Low-salt diet','Renal diet','High-protein diet','Tube feeding','Custom diet']),textareaField('Feeding instructions','feeding_instruction',form,setForm,'span-2'))),
      h('div',{className:'section-card'},h('h4',null,'5. Risks, special nurse and physiotherapy'),h('div',{className:'check-grid'},riskItems.map(([key,label])=>h('label',{className:'check-card',key},h('input',{type:'checkbox',checked:!!form[key],onChange:e=>setForm({...form,[key]:e.target.checked})}),h('span',null,label))),h('label',{className:'check-card'},h('input',{type:'checkbox',checked:form.oxygen_required,onChange:e=>setForm({...form,oxygen_required:e.target.checked})}),h('span',null,'Oxygen required')),h('label',{className:'check-card'},h('input',{type:'checkbox',checked:form.dressing_required,onChange:e=>setForm({...form,dressing_required:e.target.checked})}),h('span',null,'Wound dressing required')),h('label',{className:'check-card'},h('input',{type:'checkbox',checked:form.special_nurse_required,onChange:e=>setForm({...form,special_nurse_required:e.target.checked})}),h('span',null,'Special / dedicated nurse')),h('label',{className:'check-card'},h('input',{type:'checkbox',checked:form.physio_required,onChange:e=>setForm({...form,physio_required:e.target.checked})}),h('span',null,'Physiotherapy advised'))),form.special_nurse_required&&h('div',{className:'form-grid'},field('Special nurse name','special_nurse_name',form,setForm,true),selectField('Coverage','special_nurse_shift',form,setForm,['Day Shift','Night Shift','Both shifts / 24-hour coverage']),textareaField('Special nursing instructions','special_nurse_instructions',form,setForm,'span-2')),form.physio_required&&h('div',{className:'form-grid'},field('Therapy / exercise','therapy_type',form,setForm,true),field('Frequency','physio_frequency',form,setForm,false),field('Preferred time','physio_time',form,setForm,false,'time'),textareaField('Precautions','physio_precautions',form,setForm,'span-2'))),
      h('div',{className:'section-card'},h('h4',null,'6. Package, room and activation'),h('div',{className:'form-grid'},selectField('Package','billing_package',form,setForm,['Basic Care','Standard Assisted Care','High Dependency Care','Post-operative Care','Rehabilitation Care','Palliative Care','Custom Package']),field('Room','room_no',form,setForm,true),field('Bed','bed_no',form,setForm,true),field('Admission date','admission_date',form,setForm,true,'date'))),
      h('button',{className:'btn btn-primary full',disabled:busy},busy?'Completing admission…':'Complete Admission and Activate Care Plan')
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
      client.from('physiotherapy_orders').select(`*,patients(${patientFields})`).eq('is_active',true),
      client.from('physiotherapy_sessions').select('*').eq('session_date',today)
    ]);setMeds(m.data||[]);setMedLogs(ml.data||[]);setCare(c.data||[]);setCareLogs(cl.data||[]);setPhysio(p.data||[]);setPhysioLogs(pl.data||[]);setLoading(false)}
    React.useEffect(()=>{load();const ch=client.channel('shift-live-v31').on('postgres_changes',{event:'*',schema:'public',table:'medication_administrations'},load).on('postgres_changes',{event:'*',schema:'public',table:'care_logs'},load).on('postgres_changes',{event:'*',schema:'public',table:'physiotherapy_sessions'},load).subscribe();return()=>client.removeChannel(ch)},[]);
    function riskBadges(p){const items=[[p.fall_risk,'Fall'],[p.pressure_sore_risk,'Pressure sore'],[p.aspiration_risk,'Aspiration'],[p.wandering_risk,'Wandering'],[p.infection_risk,'Infection'],[p.seizure_history,'Seizure'],[p.oxygen_required,'Oxygen'],[p.dressing_required,'Dressing']].filter(x=>x[0]);return items.length?h('div',{className:'risk-badges'},items.map(x=>h('span',{className:'risk-badge',key:x[1]},x[1]))):null}
    async function logMedicine(order,time,status){const {data:{user}}=await client.auth.getUser();const remarks=status==='Given'?'':prompt('Enter reason / remarks:')||'';const {error}=await client.from('medication_administrations').upsert({order_id:order.id,patient_id:order.patient_id,scheduled_date:today,scheduled_time:time,status,administered_at:new Date().toISOString(),administered_by:user.id,remarks},{onConflict:'order_id,scheduled_date,scheduled_time'});if(error)alert(error.message);else load()}
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

  function Patients(){
    const [rows,setRows]=React.useState([]),[selected,setSelected]=React.useState(null),[details,setDetails]=React.useState(null),[photoUrl,setPhotoUrl]=React.useState('');
    async function load(){const {data}=await client.from('patients').select('*').order('created_at',{ascending:false});setRows(data||[])}
    React.useEffect(()=>{load();const ch=client.channel('patients-live').on('postgres_changes',{event:'*',schema:'public',table:'patients'},load).subscribe();return()=>client.removeChannel(ch)},[]);
    async function openPatient(p){setSelected(p);const [m,c,ph,d]=await Promise.all([client.from('medication_orders').select('*').eq('patient_id',p.id),client.from('care_orders').select('*').eq('patient_id',p.id),client.from('physiotherapy_orders').select('*').eq('patient_id',p.id),client.from('patient_documents').select('*').eq('patient_id',p.id).order('created_at',{ascending:false})]);setDetails({meds:m.data||[],care:c.data||[],physio:ph.data||[],docs:d.data||[]});if(p.photo_storage_path){const {data}=await client.storage.from('patient-documents').createSignedUrl(p.photo_storage_path,300);setPhotoUrl(data?.signedUrl||'')}}
    async function openDoc(doc){if(doc.storage_path){const {data,error}=await client.storage.from('patient-documents').createSignedUrl(doc.storage_path,180);if(error)return alert(error.message);window.open(data.signedUrl,'_blank','noopener')}else if(doc.document_url)window.open(doc.document_url,'_blank','noopener')}
    return h('div',{className:'card panel'},h('div',{className:'panel-head'},h('div',null,h('h3',null,'Patient Master'),h('small',null,'Identity, medical records, prescription and care plan'))),h('div',{className:'table-wrap'},h('table',{className:'table'},h('thead',null,h('tr',null,['Photo','Patient','Admission Type','Category','Room/Bed','Special Nurse','Action'].map(x=>h('th',{key:x},x)))),h('tbody',null,rows.map(r=>h('tr',{key:r.id},h('td',null,r.photo_storage_path?h('span',{className:'photo-dot'},'Photo'):'—'),h('td',null,r.full_name),h('td',null,r.admission_type||'—'),h('td',null,r.patient_category||'—'),h('td',null,`${r.room_no||'—'}-${r.bed_no||'—'}`),h('td',null,r.special_nurse_required?h('span',{className:'pill warning'},r.special_nurse_name||'Required'):'—'),h('td',null,h('button',{className:'btn btn-secondary',onClick:()=>openPatient(r)},'Open Patient File')))),rows.length===0&&h('tr',null,h('td',{colSpan:7,className:'empty'},'No patients registered'))))),selected&&details&&h('div',{className:'modal-backdrop'},h('div',{className:'card modal wide-modal'},h('div',{className:'panel-head'},h('div',{className:'patient-head'},photoUrl&&h('img',{src:photoUrl,className:'patient-photo'}),h('div',null,h('h3',null,selected.full_name),h('small',null,`${selected.admission_type||''} · ${selected.patient_category||''} · Room ${selected.room_no||'—'}-${selected.bed_no||'—'}`))),h('button',{className:'close',onClick:()=>{setSelected(null);setDetails(null);setPhotoUrl('')}},'×')),h('div',{className:'tabs-grid'},h('div',{className:'section-card'},h('h4',null,'Identity & Contacts'),h('p',null,selected.mobile||'—'),h('p',null,selected.address||'—'),h('p',null,`Attendant: ${selected.attendant_name||'—'} · ${selected.attendant_phone||'—'}`)),h('div',{className:'section-card'},h('h4',null,'Medical Overview'),h('p',null,selected.diagnosis||'—'),h('p',null,`Allergies: ${selected.allergies||'None recorded'}`),h('p',null,selected.special_instructions||'—'))),h('div',{className:'section-card'},h('h4',null,'Documents'),details.docs.map(d=>h('div',{className:'timeline-item',key:d.id},h('strong',null,d.document_type),h('span',null,d.document_name),h('button',{className:'btn btn-secondary',onClick:()=>openDoc(d)},'Open'))),details.docs.length===0&&h('p',null,'No documents')),h('div',{className:'section-card'},h('h4',null,'Active Prescription'),details.meds.map(m=>h('div',{className:'timeline-item',key:m.id},h('strong',null,`${m.medicine_name} ${m.strength||''} — ${m.dose}`),h('div',{className:'time-list'},(m.scheduled_times||[]).map(t=>h('span',{className:'time-chip',key:t},String(t).slice(0,5)))),h('div',{className:'small-note'},`${m.route} · ${m.food_instruction||''} · ${m.special_instruction||''}`))),details.meds.length===0&&h('p',null,'No medicines')),h('div',{className:'section-card'},h('h4',null,'Master Care Plan'),details.care.map(c=>h('div',{className:'timeline-item',key:c.id},h('strong',null,c.care_type),h('div',{className:'small-note'},`${c.shift} · ${c.frequency} · ${c.instruction||''}`))),details.care.length===0&&h('p',null,'No care tasks')),h('div',{className:'section-card'},h('h4',null,'Physiotherapy'),details.physio.map(x=>h('div',{className:'timeline-item',key:x.id},h('strong',null,x.therapy_type),h('div',{className:'small-note'},`${x.frequency} · ${x.precautions||''}`))),details.physio.length===0&&h('p',null,'Not advised')))))
  }

  function usePatients(){
    const [rows,setRows]=React.useState([]);
    const load=React.useCallback(async()=>{const {data}=await client.from('patients').select('*').eq('is_active',true).order('full_name');setRows(data||[])},[]);
    React.useEffect(()=>{load()},[load]); return [rows,load];
  }
  function patientSelect(rows,value,onChange,label='Patient'){return h('div',{className:'field'},h('label',null,label),h('select',{value,onChange:e=>onChange(e.target.value),required:true},h('option',{value:''},'Select patient'),rows.map(p=>h('option',{key:p.id,value:p.id},`${p.full_name} · ${p.room_no}-${p.bed_no}`))))}
  function fileInput(label,files,setFiles,accept='image/*,.pdf',camera=false){return h('div',{className:'field'},h('label',null,label),h('input',{type:'file',accept,multiple:true,capture:camera?'environment':undefined,onChange:e=>setFiles(Array.from(e.target.files||[]))}),files?.length?h('small',null,`${files.length} file(s) selected`):null)}

  function Section({title,subtitle,actions,children}){return h('div',{className:'card panel'},h('div',{className:'panel-head'},h('div',null,h('h3',null,title),subtitle&&h('small',null,subtitle)),actions),children)}

  function RoomsBeds(){
    const [patients]=usePatients(); const beds=[];for(let i=1;i<=25;i++)beds.push(i);
    return h(Section,{title:'Rooms & Beds',subtitle:'25-bed live occupancy'},h('div',{className:'bed-grid'},beds.map(n=>{const room=Math.ceil(n/2);const bed=n%2?'A':'B';const p=patients.find(x=>String(x.room_no)===String(room)&&String(x.bed_no).toUpperCase()===bed);return h('div',{className:`bed-card ${p?'occupied':''}`,key:n},h('strong',null,`Room ${room} · Bed ${bed}`),h('span',null,p?p.full_name:'Available'),p&&p.special_nurse_required&&h('small',{className:'special-alert'},'Special nurse'))})))
  }

  function DailyCare({profile}){
    const [patients]=usePatients(),[rows,setRows]=React.useState([]),[form,setForm]=React.useState({patient_id:'',care_type:'Bathing assistance',shift:currentShift(),status:'Completed',remarks:''});
    async function load(){const {data}=await client.from('care_logs').select('*,patients(full_name,room_no,bed_no),profiles!care_logs_completed_by_fkey(full_name)').order('created_at',{ascending:false}).limit(100);setRows(data||[])}
    React.useEffect(()=>{load()},[]);
    async function save(e){e.preventDefault();const {error}=await client.from('care_logs').insert({patient_id:form.patient_id,care_date:new Date().toISOString().slice(0,10),shift:form.shift,status:form.status,completed_at:new Date().toISOString(),completed_by:profile.id,remarks:`${form.care_type}: ${form.remarks}`});if(error)return alert(error.message);setForm({...form,remarks:''});load()}
    return h(React.Fragment,null,h(Section,{title:'Daily Care Entry',subtitle:'Bath, restroom, hygiene, feeding, mobility and positioning'},h('form',{className:'modal-grid',onSubmit:save},patientSelect(patients,form.patient_id,v=>setForm({...form,patient_id:v})),miniSelect('Care activity',form.care_type,['Bathing assistance','Restroom assistance','Oral hygiene','Feeding assistance','Mobility assistance','Diaper change','Position change','Fluid monitoring','Sleep assistance'],v=>setForm({...form,care_type:v})),miniSelect('Shift',form.shift,['Day Shift (7 AM–7 PM)','Night Shift (7 PM–7 AM)'],v=>setForm({...form,shift:v})),miniSelect('Status',form.status,['Completed','Refused','Not required','Pending'],v=>setForm({...form,status:v})),miniInput('Remarks',form.remarks,v=>setForm({...form,remarks:v})),h('button',{className:'btn btn-primary'},'Save care record'))),h(LogTable,{title:'Recent Care Records',rows:rows.map(r=>[r.patients?.full_name,r.shift,r.status,r.remarks,fmt(r.created_at)]),heads:['Patient','Shift','Status','Activity / Remarks','Recorded']}))
  }

  function VitalSigns({profile}){
    const [patients]=usePatients(),[rows,setRows]=React.useState([]),[form,setForm]=React.useState({patient_id:'',temperature:'',systolic:'',diastolic:'',pulse:'',spo2:'',blood_sugar:'',remarks:''});
    async function load(){const {data}=await client.from('vital_signs').select('*,patients(full_name,room_no,bed_no)').order('recorded_at',{ascending:false}).limit(100);setRows(data||[])}React.useEffect(()=>{load()},[]);
    async function save(e){e.preventDefault();const level=(Number(form.spo2)&&Number(form.spo2)<92)||(Number(form.systolic)&&Number(form.systolic)>160)?'Critical':'Normal';const {error}=await client.from('vital_signs').insert({...form,temperature:num(form.temperature),systolic:num(form.systolic),diastolic:num(form.diastolic),pulse:num(form.pulse),spo2:num(form.spo2),blood_sugar:num(form.blood_sugar),recorded_by:profile.id,alert_level:level});if(error)return window.alert(error.message);setForm({...form,temperature:'',systolic:'',diastolic:'',pulse:'',spo2:'',blood_sugar:'',remarks:''});load()}
    return h(React.Fragment,null,h(Section,{title:'Vital Signs',subtitle:'Record and highlight abnormal readings'},h('form',{className:'modal-grid',onSubmit:save},patientSelect(patients,form.patient_id,v=>setForm({...form,patient_id:v})),...['temperature','systolic','diastolic','pulse','spo2','blood_sugar'].map(k=>miniInput(k.replace('_',' ').replace(/^./,c=>c.toUpperCase()),form[k],v=>setForm({...form,[k]:v}),false,'number')),miniInput('Remarks',form.remarks,v=>setForm({...form,remarks:v})),h('button',{className:'btn btn-primary'},'Save vitals'))),h(LogTable,{title:'Recent Vital Signs',heads:['Patient','BP','Pulse','SpO₂','Sugar','Alert','Time'],rows:rows.map(r=>[r.patients?.full_name,`${r.systolic||'—'}/${r.diastolic||'—'}`,r.pulse||'—',r.spo2||'—',r.blood_sugar||'—',r.alert_level,fmt(r.recorded_at)])}))
  }

  function Medicines(){
    const [rows,setRows]=React.useState([]);async function load(){const {data}=await client.from('medication_orders').select('*,patients(full_name,room_no,bed_no)').eq('is_active',true).order('created_at',{ascending:false});setRows(data||[])}React.useEffect(()=>{load()},[]);
    return h(LogTable,{title:'Active Prescription & MAR',subtitle:'All medicines transcribed at admission',heads:['Patient','Medicine','Dose / Route','Times','Food','Special instruction'],rows:rows.map(r=>[`${r.patients?.full_name} · ${r.patients?.room_no}-${r.patients?.bed_no}`,`${r.medicine_name} ${r.strength||''}`,`${r.dose} · ${r.route}`,(r.scheduled_times||[]).map(String).join(', '),r.food_instruction||'—',r.special_instruction||'—'])})
  }

  function FoodDiet({profile}){
    const [patients]=usePatients(),[rows,setRows]=React.useState([]),[form,setForm]=React.useState({patient_id:'',meal_type:'Breakfast',menu:'',consumption_status:'Consumed fully',remarks:''});async function load(){const {data}=await client.from('meal_records').select('*,patients(full_name,room_no,bed_no)').order('served_at',{ascending:false}).limit(100);setRows(data||[])}React.useEffect(()=>{load()},[]);
    async function save(e){e.preventDefault();const {error}=await client.from('meal_records').insert({...form,meal_date:new Date().toISOString().slice(0,10),served_at:new Date().toISOString(),recorded_by:profile.id});if(error)return alert(error.message);setForm({...form,menu:'',remarks:''});load()}
    return h(React.Fragment,null,h(Section,{title:'Food & Diet',subtitle:'Meal service, intake and feeding assistance'},h('form',{className:'modal-grid',onSubmit:save},patientSelect(patients,form.patient_id,v=>setForm({...form,patient_id:v})),miniSelect('Meal',form.meal_type,['Breakfast','Lunch','Evening snack','Dinner','Tube feed','Other'],v=>setForm({...form,meal_type:v})),miniInput('Menu / feed',form.menu,v=>setForm({...form,menu:v}),true),miniSelect('Consumption',form.consumption_status,['Consumed fully','Consumed partially','Refused','Vomited','Tube feed completed'],v=>setForm({...form,consumption_status:v})),miniInput('Remarks',form.remarks,v=>setForm({...form,remarks:v})),h('button',{className:'btn btn-primary'},'Save meal record'))),h(LogTable,{title:'Recent Meal Records',heads:['Patient','Meal','Menu','Consumption','Time'],rows:rows.map(r=>[r.patients?.full_name,r.meal_type,r.menu,r.consumption_status,fmt(r.served_at)])}))
  }

  function Physiotherapy(){const [rows,setRows]=React.useState([]);async function load(){const {data}=await client.from('physiotherapy_orders').select('*,patients(full_name,room_no,bed_no)').eq('is_active',true).order('created_at',{ascending:false});setRows(data||[])}React.useEffect(()=>{load()},[]);return h(LogTable,{title:'Physiotherapy Plan',subtitle:'Therapy advised at discharge',heads:['Patient','Therapy','Frequency','Preferred time','Precautions'],rows:rows.map(r=>[r.patients?.full_name,r.therapy_type,r.frequency,r.preferred_time||'—',r.precautions||'—'])})}

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
    return h(React.Fragment,null,h(Section,{title:'Patient Documents',subtitle:'Identity proof, discharge, prescription, lab, scan and test reports'},h('form',{className:'modal-grid',onSubmit:save},patientSelect(patients,form.patient_id,v=>setForm({...form,patient_id:v})),miniSelect('Document type',form.document_type,['Identity Proof','Discharge Summary','Current Prescription','Previous Prescription','Lab Report','X-ray','CT Scan','MRI','Ultrasound','ECG','Echo','Operative Note','Physiotherapy Advice','Wound Photograph','Insurance','Consent','Other'],v=>setForm({...form,document_type:v})),miniInput('Report date',form.report_date,v=>setForm({...form,report_date:v}),false,'date'),miniInput('Hospital / Laboratory',form.hospital_laboratory,v=>setForm({...form,hospital_laboratory:v})),miniInput('Doctor',form.doctor_name,v=>setForm({...form,doctor_name:v})),miniInput('Remarks',form.remarks,v=>setForm({...form,remarks:v})),fileInput('Upload / Camera Capture',files,setFiles,'image/*,.pdf',true),h('button',{className:'btn btn-primary'},'Upload Document'))),h(LogTable,{title:'Medical Document Register',heads:['Patient','Type','Date','Hospital/Lab','Name','Action'],rows:rows.map(r=>[r.patients?.full_name,r.document_type,r.report_date||'—',r.hospital_laboratory||'—',r.document_name,h('button',{className:'btn btn-secondary',onClick:()=>openDoc(r)},'Open')])}))
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

  function Reports(){const [data,setData]=React.useState({patients:[],billing:[],incidents:[]});React.useEffect(()=>{Promise.all([client.from('patients').select('*'),client.from('billing_transactions').select('*'),client.from('incidents').select('*')]).then(([a,b,c])=>setData({patients:a.data||[],billing:b.data||[],incidents:c.data||[]}))},[]);const active=data.patients.filter(x=>x.is_active).length,high=data.patients.filter(p=>p.fall_risk||p.pressure_sore_risk||p.aspiration_risk||p.oxygen_required).length,charges=data.billing.filter(x=>x.transaction_type==='Charge').reduce((a,x)=>a+Number(x.amount||0),0),payments=data.billing.filter(x=>x.transaction_type==='Payment').reduce((a,x)=>a+Number(x.amount||0),0);return h(React.Fragment,null,h('div',{className:'grid stats'},[['Active patients',active],['High-risk patients',high],['Open incidents',data.incidents.filter(x=>x.status==='Open').length],['Total billing',`₹${charges.toLocaleString('en-IN')}`],['Collections',`₹${payments.toLocaleString('en-IN')}`],['Outstanding',`₹${(charges-payments).toLocaleString('en-IN')}`]].map(([a,b])=>h('div',{className:'card stat',key:a},h('span',null,a),h('strong',null,b)))),h(Section,{title:'Management Reports',subtitle:'Live summary from the unified production database'},h('p',null,'Use browser Print to save this report as PDF. Detailed Excel/PDF exports can be added in the next release.')))}

  function Notifications({profile}){const [rows,setRows]=React.useState([]),[title,setTitle]=React.useState(''),[message,setMessage]=React.useState('');async function load(){const {data}=await client.from('notifications').select('*').order('created_at',{ascending:false}).limit(100);setRows(data||[])}React.useEffect(()=>{load()},[]);async function save(e){e.preventDefault();const {error}=await client.from('notifications').insert({title,message,priority:'Normal',created_by:profile.id});if(error)return alert(error.message);setTitle('');setMessage('');load()}return h(React.Fragment,null,['Admin','Manager'].includes(profile.role)&&h(Section,{title:'Create Notification'},h('form',{className:'modal-grid',onSubmit:save},miniInput('Title',title,setTitle,true),miniInput('Message',message,setMessage,true),h('button',{className:'btn btn-primary'},'Publish'))),h(LogTable,{title:'Notifications',heads:['Title','Message','Priority','Date'],rows:rows.map(r=>[r.title,r.message,r.priority,fmt(r.created_at)])}))}

  function AuditTrail(){const [rows,setRows]=React.useState([]);React.useEffect(()=>{client.from('audit_log').select('*').order('created_at',{ascending:false}).limit(200).then(({data})=>setRows(data||[]))},[]);return h(LogTable,{title:'Audit Trail',subtitle:'Recent system activity',heads:['Action','Entity','Record','User','Date'],rows:rows.map(r=>[r.action,r.entity,r.entity_id||'—',r.user_id||'—',fmt(r.created_at)])})}

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

  function field(label,key,form,setForm,required,type='text'){return h('div',{className:'field',key},h('label',null,label),h('input',{type,value:form[key],required,onChange:e=>setForm({...form,[key]:e.target.value})}))}
  function selectField(label,key,form,setForm,options){return h('div',{className:'field',key},h('label',null,label),h('select',{value:form[key],onChange:e=>setForm({...form,[key]:e.target.value})},options.map(x=>h('option',{key:x,value:x},x))))}

  ReactDOM.createRoot(document.getElementById('root')).render(h(App));
})();
