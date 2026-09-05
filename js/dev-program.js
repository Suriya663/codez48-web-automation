import{initializeApp}from"https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";import{getFirestore,doc,getDoc,setDoc,updateDoc,collection,addDoc,deleteDoc,onSnapshot,query,orderBy,where,getDocs,increment,serverTimestamp,limit}from"https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";import{getAuth,signInAnonymously}from"https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";const _0x48=[atob("QUl6YVN5QkpLLTdCeTZJOXhwczUxOEhDWWMyS293NDR2cDlmRHBZ"),atob("bnNoYW5kbG9vbXMtYTE5YmUuZmlyZWJhc2VhcHAuY29t"),atob("bnNoYW5kbG9vbXMtYTE5YmU="),atob("bnNoYW5kbG9vbXMtYTE5YmUuYXBwc3BvdC5jb20="),atob("NzExNjY5MjYxNzc5"),atob("MTo3MTE2NjkyNjE3Nzk6d2ViOmQzMjNhMWU1MGI1NDA0ZWMxMGZiMjY=")];const firebaseConfig={apiKey:_0x48[0],authDomain:_0x48[1],projectId:_0x48[2],storageBucket:_0x48[3],messagingSenderId:_0x48[4],appId:_0x48[5]};const app=initializeApp(firebaseConfig);const db=getFirestore(app);const auth=getAuth(app);let currentUser=null;let isAdmin=false;const ADMIN_EMAIL=atob("Y29kZXo0ODQ4QGdtYWlsLmNvbQ==");const secretKey="z4848-protocol-key";const encrypt=t=>{if(!t)return"";return btoa(t.split('').map((c,i)=>String.fromCharCode(c.charCodeAt(0)^secretKey.charCodeAt(i%secretKey.length))).join(''))};const decrypt=e=>{if(!e)return"";try{const d=atob(e);return d.split('').map((c,i)=>String.fromCharCode(c.charCodeAt(0)^secretKey.charCodeAt(i%secretKey.length))).join('')}catch(err){return e}};

/**
 * Image Compression Utility
 */
const compressImage = (base64Str, maxWidth, maxHeight) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
            } else {
                if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
            }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
    });
};

/**
 * Handle Folder Upload for Profile Photo
 */
window.handleProfilePhoto = async (input) => {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const compressed = await compressImage(e.target.result, 300, 300);
            document.getElementById('profile-img-container').innerHTML = `<img src="${compressed}" class="w-full h-full object-cover">`;
            window.tempProfileImage = compressed;
            // Auto-sync for better UX
            if (currentUser) {
                await setDoc(doc(db, "dev_prog_users", currentUser.email), { profileImage: compressed }, { merge: true });
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
};

/**
 * Privacy Protocol: Anonymizes names for the global leaderboard.
 */
const maskName = name => {
    if (!name) return "Anonymous Developer";
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0] + ". " + "*".repeat(5);
    return parts[0][0] + ". " + parts[parts.length - 1][0] + "*".repeat(parts[parts.length - 1].length - 1);
};

window.toggleAuth=r=>{document.getElementById('login-form').classList.toggle('hidden',r);document.getElementById('register-form').classList.toggle('hidden',!r)};window.toggleMobileMenu=f=>{const s=document.getElementById('sidebar'),o=document.getElementById('sidebar-overlay'),isOpen=s.classList.contains('translate-x-0'),next=typeof f==='boolean'?f:!isOpen;if(next){s.classList.remove('-translate-x-full');s.classList.add('translate-x-0');o.classList.remove('hidden')}else{s.classList.add('-translate-x-full');s.classList.remove('translate-x-0');o.classList.add('hidden')}};window.handleLogin=async()=>{const e=document.getElementById('login-email').value.trim().toLowerCase(),p=document.getElementById('login-pass').value.trim();if(!e||!p)return alert("Credentials required.");try{await signInAnonymously(auth);if(e===ADMIN_EMAIL&&p==="codez@4848"){localStorage.setItem('dev_prog_user',JSON.stringify({email:e,pass:encrypt(p)}));isAdmin=true;enterDashboard();return}const q=query(collection(db,"dev_prog_users"),where("email","==",e));const snap=await getDocs(q);if(!snap.empty){const u=snap.docs[0].data();if(decrypt(u.password)===p){localStorage.setItem('dev_prog_user',JSON.stringify({email:e,pass:encrypt(p)}));currentUser=u;enterDashboard()}else alert("Invalid Password")}else alert("User not found in registry.")}catch(err){alert(err.message)}};window.handleSignup=async()=>{const n=document.getElementById('reg-name').value.trim(),m=document.getElementById('reg-mobile').value.trim(),u=document.getElementById('reg-upi').value.trim(),e=document.getElementById('reg-email').value.trim().toLowerCase(),p=document.getElementById('reg-pass').value.trim();if(!n||!m||!u||!e||!p)return alert("All fields required.");try{await signInAnonymously(auth);const q=query(collection(db,"dev_prog_users"),where("email","==",e));const snap=await getDocs(q);if(!snap.empty)return alert("Email already registered.");const d={name:n,mobile:m,upi:encrypt(u),email:e,password:encrypt(p),referralCode:Math.random().toString(36).substring(2,8).toUpperCase(),walletBalance:0,totalEarned:0,isSilverElite:false,profileImage:null,registeredAt:new Date().toISOString()};await setDoc(doc(db,"dev_prog_users",e),d);

try{const host=window.location.host,protocol=window.location.protocol;await fetch(`${protocol}//${host}/.netlify/functions/developerProgramRegistration`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event:'DEVELOPER_PROGRAM_REGISTERED',...d})})}catch(err){}

alert("Registration Successful! Please login.");window.toggleAuth(false)}catch(err){alert(err.message)}};window.updateProfile=async()=>{const n=document.getElementById('prof-edit-name').value.trim(),m=document.getElementById('prof-edit-mobile').value.trim(),u=document.getElementById('prof-edit-upi').value.trim();if(!n||!m||!u)return alert("All fields required.");try{await updateDoc(doc(db,"dev_prog_users",currentUser.email),{name:n,mobile:m,upi:encrypt(u)});alert("Profile Updated Successfully!")}catch(err){alert(err.message)}};const enterDashboard=()=>{document.getElementById('auth-view').classList.add('hidden');document.getElementById('dashboard-view').classList.remove('hidden');if(isAdmin||(currentUser&&currentUser.email===ADMIN_EMAIL)){isAdmin=true;document.getElementById('admin-menu').classList.remove('hidden');document.getElementById('user-welcome').innerText="System Architect Console";document.getElementById('user-name-badge').innerText="Architect";loadAdminData()}else{document.getElementById('user-welcome').innerText=`Welcome back, ${currentUser.name}.`;document.getElementById('user-name-badge').innerText=currentUser.name;document.getElementById('referral-link').value=`${window.location.origin}/index.html?ref=${currentUser.referralCode}`;loadDeveloperData();initChart([{date:'1',amount:500},{date:'2',amount:1500},{date:'3',amount:1000},{date:'4',amount:2500},{date:'5',amount:4000}])}window.showSection('home')};window.showSection=n=>{document.querySelectorAll('.dashboard-section').forEach(s=>s.classList.add('hidden'));document.getElementById(`sec-${n}`).classList.remove('hidden');document.querySelectorAll('.sidebar-item').forEach(i=>i.classList.remove('active'));const b=document.getElementById(`side-${n}`);if(b)b.classList.add('active');document.getElementById('section-title').innerText=n.replace('admin-','Manage ').toUpperCase()};let earningsChart=null;const initChart=(d=[])=>{const c=document.getElementById('earningsChart');if(!c)return;if(earningsChart)earningsChart.destroy();earningsChart=new Chart(c,{type:'line',data:{labels:d.map(i=>i.date),datasets:[{label:'Earnings',data:d.map(i=>i.amount),borderColor:'#2563EB',backgroundColor:'rgba(37, 99, 235, 0.1)',fill:true,tension:0.4,borderWidth:3,pointRadius:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{display:false},y:{beginAtZero:true,grid:{display:false},ticks:{display:false}}}}})};const loadDeveloperData=()=>{if(!currentUser)return;

        // 1. Global Network Growth Listener
        onSnapshot(collection(db, "dev_prog_users"), s => {
            const countEl = document.getElementById('stat-global-developers');
            if (countEl) countEl.innerText = s.size;
        });

        // 2. Personal Profile Listener
        onSnapshot(doc(db,"dev_prog_users",currentUser.email),d=>{
            if(d.exists()){
                currentUser=d.data();
                document.getElementById('wallet-balance').innerText=`₹${currentUser.walletBalance||0}`;
                document.getElementById('stat-total-earnings').innerText=`₹${currentUser.totalEarned||0}`;
                document.getElementById('profile-name').innerText=currentUser.name;
                document.getElementById('profile-email').innerText=currentUser.email;
                document.getElementById('prof-edit-name').value=currentUser.name;
                document.getElementById('prof-edit-mobile').value=currentUser.mobile;
                document.getElementById('prof-edit-upi').value=decrypt(currentUser.upi);

                // Set Profile Image
                if (currentUser.profileImage) {
                    document.getElementById('profile-img-container').innerHTML = `<img src="${currentUser.profileImage}" class="w-full h-full object-cover">`;
                }

                updateBonusProgress();
            }
        });

        // 3. Unique Visit/Click Listener
        onSnapshot(query(collection(db,"dev_prog_visits"),where("developerEmail","==",currentUser.email)),s=>{
            let landing = 0, profile = 0;
            s.forEach(d => {
                if(d.data().type === 'profile') profile++;
                else landing++;
            });
            document.getElementById('stat-total-visits').innerText = landing;
            document.getElementById('stat-profile-visits').innerText = profile;
        });

        // 4. Referral Integrity Listener (STRICT SCOPE + Historical Recovery + Weekly Target)
        const leadsRef = collection(db, "dev_prog_leads");
        const sellersRef = collection(db, "sellers");
        const reqsRef = collection(db, "seller_requests");

        const updateReferralsTable = (leads, sellers, reqs) => {
            const combined = new Map();
            let weeklyEarnings = 0;
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            // Helper to check if successful referral was in the last 7 days
            const isRecent = (dateStr) => {
                if (!dateStr) return false;
                return new Date(dateStr) >= sevenDaysAgo;
            };

            // Start with leads
            leads.forEach(l => combined.set(l.email, { ...l, source: 'lead' }));

            // Recover from sellers (historical)
            sellers.forEach(s => {
                if(!combined.has(s.email)) {
                    combined.set(s.email, {
                        name: s.brand || s.username,
                        mobile: s.mobile || '---',
                        paidAmount: s.revenue || 4000,
                        status: 'success',
                        date: s.approvedAt || s.date,
                        source: 'historical'
                    });
                }
            });

            // Recover from requests (historical)
            reqs.forEach(r => {
                if(!combined.has(r.email)) {
                    combined.set(r.email, {
                        name: r.brand || r.username,
                        mobile: r.mobile || '---',
                        paidAmount: r.tier === 'premium' ? 4000 : 2500,
                        status: 'pending',
                        date: r.date,
                        source: 'historical'
                    });
                }
            });

            let t = combined.size, sc = 0, h = '';
            combined.forEach(l => {
                if(l.status === 'success') {
                    sc++;
                    const commission = l.paidAmount >= 4000 ? 1000 : 500;
                    if (isRecent(l.date)) weeklyEarnings += commission;
                }

                let statusBadge = '';
                if(l.status === 'success') statusBadge = '<span class="px-3 py-1 rounded-full text-[8px] font-black uppercase bg-emerald-500 text-white">ROCKED IT</span>';
                else if(l.status === 'pending') statusBadge = '<span class="px-3 py-1 rounded-full text-[8px] font-black uppercase bg-amber-100 text-amber-600">Pending Pay</span>';
                else statusBadge = '<span class="px-3 py-1 rounded-full text-[8px] font-black uppercase bg-slate-100 text-slate-400">Form Filled</span>';

                h+=`<tr class="hover:bg-slate-50 transition"><td class="px-8 py-5">${l.name}</td><td class="px-8 py-5">${l.mobile || '---'}</td><td class="px-8 py-5">₹${l.paidAmount || 0}</td><td class="px-8 py-5 text-center">${statusBadge}</td><td class="px-8 py-5 text-right text-royal">₹${l.status==='success'?(l.paidAmount>=4000?1000:500):0}</td></tr>`;
            });

            // Weekly Target Check (₹3,000)
            const isSilverElite = weeklyEarnings >= 3000;
            const badgeEl = document.getElementById('profile-elite-badge');
            if (badgeEl) {
                badgeEl.classList.toggle('hidden', !isSilverElite);
            }
            // Save state to user doc for leaderboard visibility
            if (currentUser && currentUser.isSilverElite !== isSilverElite) {
                setDoc(doc(db, "dev_prog_users", currentUser.email), { isSilverElite }, { merge: true });
            }

            document.getElementById('stat-total-leads').innerText = t;
            document.getElementById('stat-success-leads').innerText = sc;
            document.getElementById('leads-list').innerHTML = h || '<tr><td colspan="5" class="p-8 text-center text-slate-300 uppercase tracking-widest">No referrals detected</td></tr>';
        };

        // Multi-collection monitoring
        let currentLeads = [], currentSellers = [], currentReqs = [];
        onSnapshot(query(leadsRef, where("developerEmail", "==", currentUser.email)), s => {
            currentLeads = s.docs.map(d => d.data());
            updateReferralsTable(currentLeads, currentSellers, currentReqs);
        });
        onSnapshot(query(sellersRef, where("referredBy", "==", currentUser.referralCode)), s => {
            currentSellers = s.docs.map(d => d.data());
            updateReferralsTable(currentLeads, currentSellers, currentReqs);
        });
        onSnapshot(query(reqsRef, where("referredBy", "==", currentUser.referralCode)), s => {
            currentReqs = s.docs.map(d => d.data());
            updateReferralsTable(currentLeads, currentSellers, currentReqs);
        });

        // 5. Withdrawal Integrity
        onSnapshot(query(collection(db,"dev_prog_withdrawals"),where("developerEmail","==",currentUser.email)),s=>{const d=s.docs.map(i=>i.data());d.sort((a,b)=>new Date(b.requestedAt)-new Date(a.requestedAt));document.getElementById('withdrawal-history').innerHTML=d.map(w=>`<tr><td class="px-8 py-5 text-slate-400">${new Date(w.requestedAt).toLocaleDateString()}</td><td class="px-8 py-5">₹${w.amount}</td><td class="px-8 py-5"><span class="px-3 py-1 rounded-full text-[8px] font-black uppercase ${w.status==='success'?'bg-emerald-100 text-emerald-600':(w.status==='rejected'?'bg-red-100 text-red-600':'bg-amber-100 text-amber-600')}">${w.status}</span></td><td class="px-8 py-5 text-right font-mono text-slate-400">${w.transactionId||'---'}</td></tr>`).join('')||'<tr><td colspan="4" class="p-8 text-center text-slate-300 uppercase tracking-widest">No history</td></tr>'});

        // 6. Privacy-First Leaderboard
        onSnapshot(query(collection(db,"dev_prog_users"),orderBy("totalEarned","desc")),s=>{document.getElementById('leaderboard-list').innerHTML=s.docs.slice(0,5).map((d,i)=>{const u=d.data();const isMe = u.email === currentUser.email;const displayName = isMe ? u.name : maskName(u.name);

            // Generate Profile Pic or Placeholder
            const imgHtml = u.profileImage
                ? `<img src="${u.profileImage}" class="w-8 h-8 rounded-full object-cover">`
                : `<div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-400 font-bold">${u.name[0]}</div>`;

            // Elite Badge if applicable
            const badgeHtml = u.isSilverElite
                ? `<div class="badge-silver-elite w-5 h-5 rounded-full flex items-center justify-center text-[8px]" title="Silver Elite Member"><i class="fa-solid fa-shield-halved"></i></div>`
                : '';

            return`<div class="flex items-center justify-between p-3 rounded-2xl ${i===0?'golden-highlight shadow-lg':'bg-slate-50'} ${isMe ? 'ring-1 ring-royal' : ''}">
                <div class="flex items-center gap-3">
                    <span class="w-6 h-6 flex items-center justify-center rounded-full bg-black/10 text-[10px]">#${i+1}</span>
                    <div class="relative">
                        ${imgHtml}
                        <div class="absolute -top-1 -right-1">${badgeHtml}</div>
                    </div>
                    <span class="text-[10px] font-black uppercase">${displayName} ${isMe ? '(YOU)' : ''}</span>
                </div>
                <span class="text-[10px] font-bold">₹${u.totalEarned}</span>
            </div>`}).join('')});onSnapshot(doc(db,"dev_prog_meetings","weekly"),d=>{if(d.exists()){const m=d.data();document.getElementById('active-meeting').classList.remove('hidden');document.getElementById('no-meeting').classList.add('hidden');document.getElementById('meeting-desc').innerText=m.description;document.getElementById('meeting-date').innerText=`Next Session: ${new Date(m.date).toLocaleString()}`;document.getElementById('meeting-link').href=m.link}})};const loadAdminData=()=>{onSnapshot(query(collection(db,"dev_prog_leads"),where("status","==","pending")),s=>{document.getElementById('pending-count-badge').innerText=`${s.size} Pending`;document.getElementById('admin-leads-list').innerHTML=s.docs.map(ds=>{const l=ds.data();return`<div class="glass-card p-6 rounded-3xl bg-white shadow-sm flex flex-col md:flex-row justify-between items-center gap-4"><div><h4 class="font-black text-black uppercase tracking-widest text-[10px]">${l.name}</h4><p class="text-[8px] text-slate-400 uppercase font-bold">Ref By: ${l.developerEmail} | Plan: ₹${l.paidAmount}</p><p class="text-[8px] text-royal font-mono mt-1">${l.mobile} | ${l.email}</p></div><div class="flex gap-2"><button onclick="approveLead('${ds.id}','${l.developerEmail}',${l.paidAmount})" class="bg-emerald-500 text-white px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/10">Approve</button><button onclick="deleteDocById('dev_prog_leads','${ds.id}')" class="bg-red-50 text-red-500 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest">Reject</button></div></div>`}).join('')||'<p class="text-center py-10 text-slate-300">All leads processed</p>'});onSnapshot(query(collection(db,"dev_prog_withdrawals"),where("status","==","pending")),s=>{document.getElementById('admin-withdrawal-list').innerHTML=s.docs.map(ds=>{const w=ds.data();return`<tr><td class="px-8 py-5">${w.developerEmail}</td><td class="px-8 py-5 text-royal font-black">₹${w.amount}</td><td class="px-8 py-5 font-mono text-amber-600">${decrypt(w.upi)}</td><td class="px-8 py-5 text-center flex justify-center gap-2"><button onclick="approveWithdrawal('${ds.id}')" class="bg-black text-white px-4 py-2 rounded-lg text-[8px] font-black uppercase">Paid</button><button onclick="rejectWithdrawal('${ds.id}')" class="text-red-500 hover:bg-red-50 px-3 py-1 rounded-lg transition-all"><i class="fa-solid fa-xmark"></i></button></td></tr>`}).join('')||'<tr><td colspan="4" class="p-8 text-center text-slate-300">Queue empty</td></tr>'})};window.copyReferralLink=()=>{const l=document.getElementById('referral-link');l.select();document.execCommand('copy');alert("Referral Link Copied!")};window.shareOnWhatsApp=()=>{const m=`Hi! Join the CODEZ48 Developer Program and start earning commissions. Register here: ${document.getElementById('referral-link').value}`;window.open(`https://wa.me/?text=${encodeURIComponent(m)}`,'_blank')};window.requestWithdrawal=async()=>{const b=currentUser.walletBalance||0;if(b<100)return alert("Minimum withdrawal ₹100");const lw=await getDocs(query(collection(db,"dev_prog_withdrawals"),where("developerEmail","==",currentUser.email),orderBy("requestedAt","desc")));if(!lw.empty){const d=new Date(lw.docs[0].data().requestedAt);if((new Date().getTime()-d.getTime())/(1000*3600*24)<7)return alert("Withdrawal available once every 7 days.")}try{await addDoc(collection(db,"dev_prog_withdrawals"),{developerEmail:currentUser.email,amount:b,upi:currentUser.upi,status:'pending',requestedAt:new Date().toISOString()});await updateDoc(doc(db,"dev_prog_users",currentUser.email),{walletBalance:0});alert("Withdrawal Requested! Will be processed within 24-48h.")}catch(err){console.error(err)}};window.approveLead=async(i,e,a)=>{const c=a===4000?1000:500;try{await updateDoc(doc(db,"dev_prog_leads",i),{status:'success'});await updateDoc(doc(db,"dev_prog_users",e),{walletBalance:increment(c),totalEarned:increment(c)});alert("Lead Approved! Commission added to developer wallet.")}catch(err){alert(err.message)}};window.approveWithdrawal=async i=>{const t=prompt("Enter Transaction ID:");if(!t)return;await updateDoc(doc(db,"dev_prog_withdrawals",i),{status:'success',transactionId:t})};window.rejectWithdrawal=async i=>{if(!confirm("Reject payout? Funds will be returned to user wallet."))return;const d=await getDoc(doc(db,"dev_prog_withdrawals",i));const w=d.data();await updateDoc(doc(db,"dev_prog_users",w.developerEmail),{walletBalance:increment(w.amount)});await updateDoc(doc(db,"dev_prog_withdrawals",i),{status:'rejected'})};window.broadcastMeeting=async()=>{const l=document.getElementById('meet-url-input').value,d=document.getElementById('meet-date-input').value,ds=document.getElementById('meet-desc-input').value;if(!l||!d)return alert("Link and Date required.");const meetingPayload={title:'Developer Program Live Workshop',link:l,date:d,description:ds};await setDoc(doc(db,"dev_prog_meetings","weekly"),meetingPayload);try{const host=window.location.host,protocol=window.location.protocol;await fetch(`${protocol}//${host}/.netlify/functions/developerProgramMeeting`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event:'DEVELOPER_PROGRAM_MEETING_CREATED',...meetingPayload})})}catch(e){}alert("Workshop broadcasted to all developers!")};const updateBonusProgress=()=>{const e=currentUser.totalEarned||0,t=30000,p=Math.min(100,(e/t)*100);document.getElementById('monthly-bonus-banner').classList.remove('hidden');document.getElementById('bonus-progress-bar').style.width=`${p}%`;document.getElementById('bonus-percent').innerText=`${Math.floor(p)}%`;document.getElementById('bonus-needed').innerText=e>=t?"Goal Reached!":`₹${(t-e).toLocaleString()} needed`;if(e>=t&&!currentUser.bonusClaimed){document.getElementById('btn-claim-reward').classList.remove('hidden')}};window.claimMonthlyReward=async()=>{await updateDoc(doc(db,"dev_prog_users",currentUser.email),{walletBalance:increment(3000),totalEarned:increment(3000),bonusClaimed:true});alert("₹3,000 Performance Bonus Claimed!");document.getElementById('btn-claim-reward').classList.add('hidden')};window.logout=()=>{localStorage.removeItem('dev_prog_user');location.reload()};window.deleteDocById=async(c,i)=>{if(confirm("Delete this entry?"))await deleteDoc(doc(db,c,i))};window.onload=()=>{const iO=document.getElementById('premium-intro');const play=async()=>{await new Promise(r=>setTimeout(r,2200));const rC=document.getElementById('painting-overlay');rC.style.display='block';rC.style.animation="paintingSpread 1.2s cubic-bezier(0.4,0,0.2,1) forwards";setTimeout(()=>{iO.style.opacity='0';setTimeout(()=>{iO.remove();rC.style.transition="opacity 0.8s ease-out";rC.style.opacity="0";setTimeout(()=>rC.remove(),800)},400)},600)};play();const s=localStorage.getItem('dev_prog_user');if(s){const{email:e,pass:p}=JSON.parse(s);document.getElementById('login-email').value=e;document.getElementById('login-pass').value=decrypt(p);window.handleLogin()}};
