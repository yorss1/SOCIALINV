/* =====================================================
   SvBackend — única puerta de entrada al backend (Supabase)
   · Si no hay configuración (source/js/config.js vacío) `enabled` es false y la app
     sigue funcionando en modo local, igual que antes.
   · Toda la seguridad real vive en las políticas RLS de la base de datos;
     aquí solo hay comodidad y mensajes de error en español.
   ===================================================== */
(function (global) {
  'use strict';
  const cfg = global.SOCIALINV_CONFIG || {};
  const enabled = !!(cfg.supabaseUrl && cfg.supabaseAnonKey && global.supabase && global.supabase.createClient);
  const sb = enabled
    ? global.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      })
    : null;

  const ERRORS = [
    [/invalid login credentials/i, 'Correo o contraseña incorrectos'],
    [/email not confirmed/i, 'Confirma tu correo antes de entrar'],
    [/user already registered|already been registered/i, 'Ese correo ya tiene una cuenta'],
    [/password should be at least/i, 'La contraseña es demasiado corta'],
    [/rate limit|too many/i, 'Demasiados intentos, espera un momento'],
    [/duplicate key.*username|profiles_username_key/i, 'Ese nombre de usuario ya existe'],
    [/row-level security|permission denied/i, 'No tienes permiso para hacer eso'],
    [/exceeded the maximum|payload too large|too large/i, 'El archivo es demasiado grande (máximo 10 MB)'],
    [/mime type|not allowed/i, 'Ese tipo de archivo no está permitido'],
    [/failed to fetch|network/i, 'Sin conexión con el servidor']
  ];
  function friendly(err) {
    const m = (err && (err.message || err.error_description)) || String(err || '');
    for (const [re, txt] of ERRORS) if (re.test(m)) return txt;
    return m || 'Ocurrió un error inesperado';
  }
  async function run(promise) {
    const { data, error } = await promise;
    if (error) throw new Error(friendly(error));
    return data;
  }
  function need() { if (!enabled) throw new Error('El backend no está configurado'); }

  /* ---------- Imágenes: comprimir a WebP antes de subir (cuida el 1 GB del plan free) ---------- */
  function compressImage(file, opts) {
    const max = (opts && opts.max) || 1600, q = (opts && opts.quality) || 0.82;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return Promise.resolve(file);
    return new Promise((resolve) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob((b) => resolve(b && b.size < file.size ? new File([b], 'img.webp', { type: 'image/webp' }) : file), 'image/webp', q);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }
  async function upload(bucket, file) {
    need();
    const uid = (await sb.auth.getUser()).data.user.id;
    const f = bucket === 'chat-media' || /^video|^audio/.test(file.type) ? file : await compressImage(file, bucket === 'avatars' ? { max: 512 } : {});
    const ext = (f.type.split('/')[1] || 'bin').replace('jpeg', 'jpg');
    const path = uid + '/' + crypto.randomUUID() + '.' + ext;
    await run(sb.storage.from(bucket).upload(path, f, { contentType: f.type, upsert: false }));
    return bucket === 'chat-media' ? path : sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  const POST_SELECT = '*, author:profiles(id,username,display_name,avatar_url)';
  const api = {
    enabled, client: sb, friendly, compressImage, upload,

    /* ----- Identidad ----- */
    async signUp({ email, password, username, name, birthDate }) {
      need();
      return run(sb.auth.signUp({ email, password, options: { data: { username: String(username).toLowerCase(), name, birth_date: birthDate } } }));
    },
    async signIn(email, password) { need(); return run(sb.auth.signInWithPassword({ email, password })); },
    async signOut() { need(); const { error } = await sb.auth.signOut(); if (error) throw new Error(friendly(error)); },
    async resetPassword(email) { need(); return run(sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname })); },
    async updatePassword(password) { need(); return run(sb.auth.updateUser({ password })); },
    async session() { if (!enabled) return null; return (await sb.auth.getSession()).data.session; },
    onAuth(cb) { if (enabled) sb.auth.onAuthStateChange((event, session) => cb(event, session)); },

    /* ----- Perfil ----- */
    async myProfile() { need(); const u = (await sb.auth.getUser()).data.user; return run(sb.from('profiles').select('*').eq('id', u.id).single()); },
    async profile(username) { need(); return run(sb.from('profiles').select('*').ilike('username', username).maybeSingle()); },
    async updateProfile(patch) {
      need();
      const allowed = ['display_name', 'bio', 'avatar_url', 'cover_url', 'links', 'info', 'is_private', 'show_online', 'show_followers', 'show_following'];
      const clean = {}; allowed.forEach((k) => { if (k in patch) clean[k] = patch[k]; });
      const u = (await sb.auth.getUser()).data.user;
      return run(sb.from('profiles').update(clean).eq('id', u.id).select().single());
    },
    async searchProfiles(q) { need(); return run(sb.rpc('search_profiles', { q })); },

    /* ----- Relaciones ----- */
    async follow(id) { need(); const u = (await sb.auth.getUser()).data.user; return run(sb.from('follows').insert({ follower_id: u.id, followee_id: id }).select().single()); },
    async unfollow(id) { need(); const u = (await sb.auth.getUser()).data.user; return run(sb.from('follows').delete().eq('follower_id', u.id).eq('followee_id', id)); },
    async acceptFollow(followerId) { need(); const u = (await sb.auth.getUser()).data.user; return run(sb.from('follows').update({ status: 'accepted' }).eq('follower_id', followerId).eq('followee_id', u.id)); },
    async block(id) { need(); const u = (await sb.auth.getUser()).data.user; return run(sb.from('blocks').insert({ blocker_id: u.id, blocked_id: id })); },
    async unblock(id) { need(); const u = (await sb.auth.getUser()).data.user; return run(sb.from('blocks').delete().eq('blocker_id', u.id).eq('blocked_id', id)); },

    async myFollowing() { need(); const u = (await sb.auth.getUser()).data.user; return run(sb.from('follows').select('status, who:profiles!follows_followee_id_fkey(id,username)').eq('follower_id', u.id)); },
    async myBlocks() { need(); const u = (await sb.auth.getUser()).data.user; return run(sb.from('blocks').select('who:profiles!blocks_blocked_id_fkey(id,username)').eq('blocker_id', u.id)); },
    async myMutes() { need(); const u = (await sb.auth.getUser()).data.user; return run(sb.from('mutes').select('who:profiles!mutes_muted_id_fkey(id,username)').eq('muter_id', u.id)); },
    async mute(id) { need(); const u = (await sb.auth.getUser()).data.user; return run(sb.from('mutes').insert({ muter_id: u.id, muted_id: id })); },
    async unmute(id) { need(); const u = (await sb.auth.getUser()).data.user; return run(sb.from('mutes').delete().eq('muter_id', u.id).eq('muted_id', id)); },
    async followerRequests() { need(); const u = (await sb.auth.getUser()).data.user; return run(sb.from('follows').select('who:profiles!follows_follower_id_fkey(id,username)').eq('followee_id', u.id).eq('status', 'pending')); },

    /* ----- Publicaciones ----- */
    async createPost({ caption, files, location, visibility, allowComments, kind, communityId }) {
      need();
      const u = (await sb.auth.getUser()).data.user;
      const media = [];
      for (const f of files || []) media.push({ url: await upload('post-media', f), type: f.type.startsWith('video') ? 'video' : 'image' });
      return run(sb.from('posts').insert({ author_id: u.id, caption: caption || '', media, location: location || null, visibility: visibility || 'public', allow_comments: allowComments !== false, kind: kind || 'post', community_id: communityId || null }).select(POST_SELECT).single());
    },
    async feed(before) { need(); return run(sb.rpc('get_feed', before ? { p_before: before } : {}).select(POST_SELECT)); },
    async reels(before) { need(); return run(sb.rpc('get_reels', before ? { p_before: before } : {}).select(POST_SELECT)); },
    async explore(before) { need(); return run(sb.rpc('get_explore', before ? { p_before: before } : {}).select(POST_SELECT)); },
    async userPosts(userId, before) {
      need();
      let q = sb.from('posts').select(POST_SELECT).eq('author_id', userId).eq('kind', 'post').is('community_id', null).order('created_at', { ascending: false }).limit(30);
      if (before) q = q.lt('created_at', before);
      return run(q);
    },
    async deletePost(id) { need(); return run(sb.from('posts').delete().eq('id', id)); },
    async setLike(postId, on) {
      need(); const u = (await sb.auth.getUser()).data.user;
      return on ? run(sb.from('likes').insert({ user_id: u.id, post_id: postId })) : run(sb.from('likes').delete().eq('user_id', u.id).eq('post_id', postId));
    },
    async setSave(postId, on) {
      need(); const u = (await sb.auth.getUser()).data.user;
      return on ? run(sb.from('saves').insert({ user_id: u.id, post_id: postId })) : run(sb.from('saves').delete().eq('user_id', u.id).eq('post_id', postId));
    },
    async myLikes(ids) { need(); if (!ids.length) return []; const u = (await sb.auth.getUser()).data.user; return (await run(sb.from('likes').select('post_id').eq('user_id', u.id).in('post_id', ids))).map((r) => r.post_id); },
    async mySaves(ids) { need(); if (!ids.length) return []; const u = (await sb.auth.getUser()).data.user; return (await run(sb.from('saves').select('post_id').eq('user_id', u.id).in('post_id', ids))).map((r) => r.post_id); },
    async myCommentLikes(ids) { need(); if (!ids.length) return []; const u = (await sb.auth.getUser()).data.user; return (await run(sb.from('comment_likes').select('comment_id').eq('user_id', u.id).in('comment_id', ids))).map((r) => r.comment_id); },
    async setCommentLike(id, on) {
      need(); const u = (await sb.auth.getUser()).data.user;
      return on ? run(sb.from('comment_likes').insert({ user_id: u.id, comment_id: id })) : run(sb.from('comment_likes').delete().eq('user_id', u.id).eq('comment_id', id));
    },
    async followersOf(id) { need(); return run(sb.from('follows').select('who:profiles!follows_follower_id_fkey(id,username,display_name,avatar_url)').eq('followee_id', id).eq('status', 'accepted').limit(200)); },
    async followingOf(id) { need(); return run(sb.from('follows').select('who:profiles!follows_followee_id_fkey(id,username,display_name,avatar_url)').eq('follower_id', id).eq('status', 'accepted').limit(200)); },
    async comments(postId) { need(); return run(sb.from('comments').select('*, author:profiles(id,username,display_name,avatar_url)').eq('post_id', postId).order('created_at')); },
    async addComment(postId, body, parentId) {
      need(); const u = (await sb.auth.getUser()).data.user;
      return run(sb.from('comments').insert({ post_id: postId, author_id: u.id, body, parent_id: parentId || null }).select('*, author:profiles(id,username,display_name,avatar_url)').single());
    },
    async deleteComment(id) { need(); return run(sb.from('comments').delete().eq('id', id)); },

    /* ----- Comunidades ----- */
    async myCommunities() { need(); const u = (await sb.auth.getUser()).data.user; return run(sb.from('community_members').select('role,status,community:communities(id,slug,name,description,is_private,members_count,owner_id)').eq('user_id', u.id)); },
    async discoverCommunities(q) {
      need();
      let r = sb.from('communities').select('id,slug,name,description,is_private,members_count,owner_id').order('members_count', { ascending: false }).limit(30);
      if (q && q.trim().length >= 2) r = r.ilike('name', '%' + q.trim().replace(/[%_]/g, '') + '%');
      return run(r);
    },
    async createCommunity({ name, description, isPrivate }) {
      need(); const u = (await sb.auth.getUser()).data.user;
      const slug = String(name).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) + '-' + Math.random().toString(36).slice(2, 6);
      return run(sb.from('communities').insert({ name, slug, description: description || '', is_private: !!isPrivate, owner_id: u.id }).select().single());
    },
    async myMembership(cid) { need(); const u = (await sb.auth.getUser()).data.user; return run(sb.from('community_members').select('role,status').eq('community_id', cid).eq('user_id', u.id).maybeSingle()); },
    async joinCommunity(cid) { need(); const u = (await sb.auth.getUser()).data.user; return run(sb.from('community_members').insert({ community_id: cid, user_id: u.id }).select('role,status').single()); },
    async leaveCommunity(cid) { need(); const u = (await sb.auth.getUser()).data.user; return run(sb.from('community_members').delete().eq('community_id', cid).eq('user_id', u.id)); },
    async pendingMembers(cid) { need(); return run(sb.from('community_members').select('user:profiles(id,username,display_name,avatar_url)').eq('community_id', cid).eq('status', 'pending')); },
    async approveMember(cid, uid) { need(); return run(sb.from('community_members').update({ status: 'active' }).eq('community_id', cid).eq('user_id', uid)); },
    async rejectMember(cid, uid) { need(); return run(sb.from('community_members').delete().eq('community_id', cid).eq('user_id', uid)); },
    async communityPosts(cid, before) {
      need();
      let q = sb.from('posts').select(POST_SELECT).eq('community_id', cid).is('deleted_at', null).order('created_at', { ascending: false }).limit(30);
      if (before) q = q.lt('created_at', before);
      return run(q);
    },

    /* ----- Historias ----- */
    async createStory({ file, text, hiddenText }) {
      need(); const u = (await sb.auth.getUser()).data.user;
      const url = file ? await upload('stories', file) : null;
      return run(sb.from('stories').insert({ author_id: u.id, media_url: url, media_type: file ? (file.type.startsWith('video') ? 'video' : 'image') : 'text', text: text || null, hidden_text: hiddenText || null }).select().single());
    },
    async stories() { need(); return run(sb.from('stories').select('*, author:profiles(id,username,display_name,avatar_url)').gt('expires_at', new Date().toISOString()).order('created_at')); },
    async markStorySeen(id) { need(); const u = (await sb.auth.getUser()).data.user; await sb.from('story_views').upsert({ story_id: id, viewer_id: u.id }, { ignoreDuplicates: true }); },

    /* ----- Mensajería ----- */
    async startDm(userId) { need(); return run(sb.rpc('start_dm', { other: userId })); },
    async conversations() {
      need();
      return run(sb.from('conversation_members').select('last_read_at, conversation:conversations(id,is_group,title, members:conversation_members(last_read_at, user:profiles(id,username,display_name,avatar_url)))'));
    },
    async messages(convId, before) {
      need();
      let q = sb.from('messages').select('*').eq('conversation_id', convId).is('deleted_at', null).order('created_at', { ascending: false }).limit(40);
      if (before) q = q.lt('created_at', before);
      return run(q);
    },
    async convMembers(convId) { need(); return run(sb.from('conversation_members').select('user_id,last_read_at').eq('conversation_id', convId)); },
    async markConversationRead(convId) { need(); const u = (await sb.auth.getUser()).data.user; return run(sb.from('conversation_members').update({ last_read_at: new Date().toISOString() }).eq('conversation_id', convId).eq('user_id', u.id)); },
    async editMessage(id, body) { need(); return run(sb.from('messages').update({ body }).eq('id', id)); },
    async deleteMessage(id) { need(); return run(sb.from('messages').update({ deleted_at: new Date().toISOString() }).eq('id', id)); },
    async sendMessage(convId, body, kind, mediaUrl) {
      need(); const u = (await sb.auth.getUser()).data.user;
      return run(sb.from('messages').insert({ conversation_id: convId, sender_id: u.id, body: body || '', kind: kind || 'text', media_url: mediaUrl || null }).select().single());
    },
    subscribeAllMessages(cb) {
      need();
      const ch = sb.channel('msgs-all')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (p) => cb(p.new, 'INSERT'))
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (p) => cb(p.new, 'UPDATE')).subscribe();
      return () => sb.removeChannel(ch);
    },
    async signedChatUrl(path) { need(); const { data, error } = await sb.storage.from('chat-media').createSignedUrl(path, 3600); return error ? null : data.signedUrl; },
    subscribeMessages(convId, cb) {
      need();
      const ch = sb.channel('msgs-' + convId).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'conversation_id=eq.' + convId }, (p) => cb(p.new)).subscribe();
      return () => sb.removeChannel(ch);
    },

    /* ----- Notificaciones ----- */
    async notifications() { need(); return run(sb.from('notifications').select('*, actor:profiles(id,username,display_name,avatar_url)').order('created_at', { ascending: false }).limit(50)); },
    async markNotificationsRead(ids) { need(); let q = sb.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null); if (ids && ids.length) q = q.in('id', ids); return run(q); },
    async deleteNotification(id) { need(); return run(sb.from('notifications').delete().eq('id', id)); },
    async rejectFollow(followerId) { need(); const u = (await sb.auth.getUser()).data.user; return run(sb.from('follows').delete().eq('follower_id', followerId).eq('followee_id', u.id)); },
    async myStoryViews() { need(); return (await run(sb.from('story_views').select('story_id'))).map((r) => r.story_id); },
    async exportData() { need(); return run(sb.rpc('export_my_data')); },
    async deleteAccount() { need(); return run(sb.rpc('delete_my_account')); },
    subscribeNotifications(cb) {
      need();
      const ch = sb.channel('notifs').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (p) => cb(p.new)).subscribe();
      return () => sb.removeChannel(ch);
    },

    /* ----- Moderación ----- */
    async report(targetType, targetId, reason, details) {
      need(); const u = (await sb.auth.getUser()).data.user;
      return run(sb.from('reports').insert({ reporter_id: u.id, target_type: targetType, target_id: targetId, reason, details: details || null }));
    }
  };
  global.SvBackend = api;
})(window);
