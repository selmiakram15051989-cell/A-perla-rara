import { useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'

const STORAGE_KEY = 'aperlarara-local-db-v1'
const ROLE = {
  ADMIN: 'ADMIN',
  USER: 'USER',
}

const CLIENT_ALIASES = {
  nom: ['nom', 'name', 'client', 'full_name', 'fullname'],
  email: ['email', 'mail', 'courriel'],
  tel: ['tel', 'telephone', 'phone', 'mobile'],
  date_naissance: ['date_naissance', 'naissance', 'birthday', 'birth_date'],
  points_cumules: ['points', 'points_cumules', 'points_cumules_total'],
  visites_count: ['visites', 'visites_count', 'nombre_visites', 'visits'],
  type_peau: ['type_peau', 'type de peau', 'skin_type'],
}

const SOIN_ALIASES = {
  nom: ['nom', 'name', 'soin'],
  categorie: ['categorie', 'category', 'catégorie'],
  prix: ['prix', 'price', 'montant'],
  duree: ['duree', 'durée', 'duration', 'minutes'],
  actif: ['actif', 'active', 'is_active'],
}

const SEED_DB = {
  clients: [
    {
      id: 'cli_1',
      nom: 'Camille Martin',
      email: 'camille@example.com',
      tel: '0611223344',
      date_naissance: '1991-03-24',
      points_cumules: 420,
      visites_count: 4,
      type_peau: 'Mixte',
    },
    {
      id: 'cli_2',
      nom: 'Sarah Legrand',
      email: 'sarah@example.com',
      tel: '0677001122',
      date_naissance: '1988-10-08',
      points_cumules: 780,
      visites_count: 7,
      type_peau: 'Sensible',
    },
  ],
  soins: [
    {
      id: 'soin_1',
      nom: 'Kobido Signature',
      categorie: 'Lift & Éclat',
      prix: 120,
      duree: 60,
      actif: true,
    },
    {
      id: 'soin_2',
      nom: 'Drainage Facial Premium',
      categorie: 'Detox',
      prix: 95,
      duree: 45,
      actif: true,
    },
    {
      id: 'soin_3',
      nom: 'Rituel Anti-Âge Perla',
      categorie: 'Anti-Âge',
      prix: 150,
      duree: 75,
      actif: true,
    },
  ],
  visites: [
    {
      id: 'vis_1',
      client_id: 'cli_1',
      soin_id: 'soin_1',
      date: '2026-02-10',
      montant: 120,
      points_attribues: 120,
    },
    {
      id: 'vis_2',
      client_id: 'cli_1',
      soin_id: 'soin_2',
      date: '2026-03-07',
      montant: 95,
      points_attribues: 95,
    },
    {
      id: 'vis_3',
      client_id: 'cli_2',
      soin_id: 'soin_3',
      date: '2026-03-20',
      montant: 150,
      points_attribues: 150,
    },
  ],
  recompenses: [
    {
      id: 'rec_1',
      nom: 'Mini soin offert',
      palier_visites: 5,
      pourcentage_reduction: 10,
    },
    {
      id: 'rec_2',
      nom: 'Rituel Signature -15%',
      palier_visites: 10,
      pourcentage_reduction: 15,
    },
    {
      id: 'rec_3',
      nom: 'Expérience Premium -20%',
      palier_visites: 15,
      pourcentage_reduction: 20,
    },
  ],
  users: [
    {
      id: 'usr_1',
      name: 'Gérante',
      email: 'admin@aperlarara.com',
      password: 'admin123',
      role: ROLE.ADMIN,
      client_id: null,
    },
    {
      id: 'usr_2',
      name: 'Camille Martin',
      email: 'camille@example.com',
      password: 'client123',
      role: ROLE.USER,
      client_id: 'cli_1',
    },
  ],
  invitations: [],
  settings: {
    birthdayDiscountPercent: 12,
    bookingUrl: 'https://book.pure-informatique.com/...',
  },
}

const EMPTY_CLIENT = {
  nom: '',
  email: '',
  tel: '',
  date_naissance: '',
  points_cumules: 0,
  visites_count: 0,
  type_peau: '',
}

const EMPTY_SOIN = {
  nom: '',
  categorie: '',
  prix: 0,
  duree: 60,
  actif: true,
}

const EMPTY_VISIT = {
  client_id: '',
  soin_id: '',
  date: todayISO(),
  montant: 0,
  points_attribues: 0,
}

const EMPTY_INVITATION = {
  email: '',
  role: ROLE.USER,
  client_id: '',
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function createId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36)}`
}

function normalizeKey(input) {
  return String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w]+/g, '_')
    .toLowerCase()
    .trim()
}

function safeNumber(value, fallback = 0) {
  const numeric = Number(String(value ?? '').replace(',', '.'))
  return Number.isFinite(numeric) ? numeric : fallback
}

function safeBoolean(value, fallback = true) {
  if (typeof value === 'boolean') {
    return value
  }
  const normalized = normalizeKey(value)
  if (['1', 'true', 'yes', 'oui', 'actif'].includes(normalized)) {
    return true
  }
  if (['0', 'false', 'no', 'non', 'inactif'].includes(normalized)) {
    return false
  }
  return fallback
}

function loadDb() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return SEED_DB
    }
    const parsed = JSON.parse(raw)
    return {
      ...SEED_DB,
      ...parsed,
      settings: {
        ...SEED_DB.settings,
        ...(parsed.settings || {}),
      },
    }
  } catch {
    return SEED_DB
  }
}

function detectColumnMap(headers, aliases) {
  const normalizedHeaders = headers.reduce((accumulator, header) => {
    accumulator[normalizeKey(header)] = header
    return accumulator
  }, {})

  return Object.keys(aliases).reduce((accumulator, field) => {
    const match = aliases[field].find((name) => normalizedHeaders[normalizeKey(name)])
    if (match) {
      accumulator[field] = normalizedHeaders[normalizeKey(match)]
    }
    return accumulator
  }, {})
}

function computeBirthdayDiscount(client, settings) {
  if (!client?.date_naissance || !settings?.birthdayDiscountPercent) {
    return 0
  }
  const birthday = new Date(client.date_naissance)
  const today = new Date()
  if (
    birthday.getDate() === today.getDate() &&
    birthday.getMonth() === today.getMonth()
  ) {
    return settings.birthdayDiscountPercent
  }
  return 0
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(safeNumber(amount))
}

function App() {
  const [db, setDb] = useState(loadDb)
  const [session, setSession] = useState(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  }, [db])

  const activeUser = useMemo(() => {
    if (!session?.userId) {
      return null
    }
    return db.users.find((user) => user.id === session.userId) || null
  }, [db.users, session])

  function updateDb(updater) {
    setDb((previous) => (typeof updater === 'function' ? updater(previous) : updater))
  }

  function handleLogin(credentials) {
    const user = db.users.find(
      (candidate) =>
        candidate.email.toLowerCase() === credentials.email.toLowerCase() &&
        candidate.password === credentials.password,
    )
    if (!user) {
      return { ok: false, message: 'Identifiants invalides.' }
    }
    if (user.role === ROLE.USER && !user.client_id) {
      return {
        ok: false,
        message: 'Compte client non lié à une fiche. Contactez la gérante.',
      }
    }
    setSession({ userId: user.id })
    return { ok: true }
  }

  function handleLogout() {
    setSession(null)
  }

  if (!activeUser) {
    return <LoginScreen users={db.users} onLogin={handleLogin} />
  }

  return (
    <div className="lux-shell">
      <header className="mb-4 flex items-center justify-between rounded-2xl border border-[--lux-border] bg-[--lux-card] px-4 py-3 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-[--lux-muted]">
            Centre facialiste expert
          </p>
          <h1 className="serif-title app-title">A Perla Rara</h1>
        </div>
        <div className="text-right">
          <p className="text-sm text-[--lux-muted]">
            {activeUser.name} · {activeUser.role}
          </p>
          <button
            type="button"
            className="lux-btn lux-btn-ghost mt-2 text-sm"
            onClick={handleLogout}
          >
            Se déconnecter
          </button>
        </div>
      </header>

      {activeUser.role === ROLE.ADMIN ? (
        <AdminDashboard
          db={db}
          activeUser={activeUser}
          onDbChange={updateDb}
        />
      ) : (
        <ClientSpace db={db} user={activeUser} />
      )}
    </div>
  )
}

function LoginScreen({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  function submit(event) {
    event.preventDefault()
    const result = onLogin(form)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setError('')
  }

  function quickFill(role) {
    if (role === ROLE.ADMIN) {
      setForm({ email: 'admin@aperlarara.com', password: 'admin123' })
      return
    }
    setForm({ email: 'camille@example.com', password: 'client123' })
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center p-4">
      <section className="lux-card p-5">
        <p className="text-xs uppercase tracking-[0.26em] text-[--lux-muted]">
          Application de fidélisation
        </p>
        <h1 className="serif-title mt-2 text-3xl text-[#2f2419]">A Perla Rara</h1>
        <p className="mt-2 text-sm text-[--lux-muted]">
          Connectez-vous en tant que gérante (ADMIN) ou cliente (USER).
        </p>

        <form className="mt-5 space-y-3" onSubmit={submit}>
          <div>
            <label className="mb-1 block text-sm text-[--lux-muted]" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="lux-input"
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, email: event.target.value }))
              }
              required
            />
          </div>
          <div>
            <label
              className="mb-1 block text-sm text-[--lux-muted]"
              htmlFor="password"
            >
              Mot de passe
            </label>
            <input
              id="password"
              className="lux-input"
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, password: event.target.value }))
              }
              required
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button className="lux-btn lux-btn-accent w-full" type="submit">
            Se connecter
          </button>
        </form>

        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <button
            type="button"
            className="lux-btn lux-btn-primary"
            onClick={() => quickFill(ROLE.ADMIN)}
          >
            Demo ADMIN
          </button>
          <button
            type="button"
            className="lux-btn lux-btn-ghost"
            onClick={() => quickFill(ROLE.USER)}
          >
            Demo CLIENT
          </button>
        </div>
      </section>
    </main>
  )
}

function AdminDashboard({ db, onDbChange }) {
  const [tab, setTab] = useState('clients')
  const [clientForm, setClientForm] = useState(EMPTY_CLIENT)
  const [clientEditId, setClientEditId] = useState(null)

  const [soinForm, setSoinForm] = useState(EMPTY_SOIN)
  const [soinEditId, setSoinEditId] = useState(null)

  const [visitForm, setVisitForm] = useState(EMPTY_VISIT)
  const [visitMessage, setVisitMessage] = useState('')

  const [settingsForm, setSettingsForm] = useState({
    birthdayDiscountPercent: db.settings.birthdayDiscountPercent,
    bookingUrl: db.settings.bookingUrl,
  })

  const [importType, setImportType] = useState('clients')
  const [importRows, setImportRows] = useState([])
  const [importMap, setImportMap] = useState({})
  const [importStatus, setImportStatus] = useState('')

  const [invitationForm, setInvitationForm] = useState(EMPTY_INVITATION)
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: ROLE.USER,
    client_id: '',
  })

  const rewardTarget = useMemo(() => {
    return [...db.recompenses].sort((first, second) => first.palier_visites - second.palier_visites)
  }, [db.recompenses])

  function saveClient(event) {
    event.preventDefault()
    const payload = {
      ...clientForm,
      points_cumules: safeNumber(clientForm.points_cumules),
      visites_count: safeNumber(clientForm.visites_count),
    }
    if (!payload.nom.trim()) {
      return
    }

    onDbChange((previous) => {
      if (clientEditId) {
        return {
          ...previous,
          clients: previous.clients.map((client) =>
            client.id === clientEditId ? { ...client, ...payload } : client,
          ),
        }
      }
      return {
        ...previous,
        clients: [...previous.clients, { ...payload, id: createId('cli') }],
      }
    })
    setClientEditId(null)
    setClientForm(EMPTY_CLIENT)
  }

  function editClient(client) {
    setClientEditId(client.id)
    setClientForm(client)
    setTab('clients')
  }

  function deleteClient(clientId) {
    onDbChange((previous) => ({
      ...previous,
      clients: previous.clients.filter((client) => client.id !== clientId),
      visites: previous.visites.filter((visit) => visit.client_id !== clientId),
      users: previous.users.filter((user) => user.client_id !== clientId),
      invitations: previous.invitations.filter(
        (invitation) => invitation.client_id !== clientId,
      ),
    }))
    if (clientEditId === clientId) {
      setClientEditId(null)
      setClientForm(EMPTY_CLIENT)
    }
  }

  function saveSoin(event) {
    event.preventDefault()
    const payload = {
      ...soinForm,
      prix: safeNumber(soinForm.prix),
      duree: safeNumber(soinForm.duree, 60),
      actif: safeBoolean(soinForm.actif, true),
    }
    if (!payload.nom.trim()) {
      return
    }
    onDbChange((previous) => {
      if (soinEditId) {
        return {
          ...previous,
          soins: previous.soins.map((soin) =>
            soin.id === soinEditId ? { ...soin, ...payload } : soin,
          ),
        }
      }
      return {
        ...previous,
        soins: [...previous.soins, { ...payload, id: createId('soin') }],
      }
    })
    setSoinEditId(null)
    setSoinForm(EMPTY_SOIN)
  }

  function editSoin(soin) {
    setSoinEditId(soin.id)
    setSoinForm(soin)
    setTab('soins')
  }

  function deleteSoin(soinId) {
    onDbChange((previous) => ({
      ...previous,
      soins: previous.soins.filter((soin) => soin.id !== soinId),
      visites: previous.visites.filter((visit) => visit.soin_id !== soinId),
    }))
    if (soinEditId === soinId) {
      setSoinEditId(null)
      setSoinForm(EMPTY_SOIN)
    }
  }

  function addVisit(event) {
    event.preventDefault()
    const amount = safeNumber(visitForm.montant)
    const points = safeNumber(visitForm.points_attribues, Math.round(amount))
    if (!visitForm.client_id || !visitForm.soin_id || !visitForm.date) {
      setVisitMessage('Veuillez renseigner client, soin et date.')
      return
    }
    const visit = {
      id: createId('vis'),
      client_id: visitForm.client_id,
      soin_id: visitForm.soin_id,
      date: visitForm.date,
      montant: amount,
      points_attribues: points,
    }
    onDbChange((previous) => ({
      ...previous,
      visites: [visit, ...previous.visites],
      clients: previous.clients.map((client) =>
        client.id === visitForm.client_id
          ? {
              ...client,
              visites_count: safeNumber(client.visites_count) + 1,
              points_cumules: safeNumber(client.points_cumules) + points,
            }
          : client,
      ),
    }))
    setVisitMessage('Visite ajoutée et fidélité mise à jour.')
  }

  function onSoinSelect(soinId) {
    const selectedSoin = db.soins.find((soin) => soin.id === soinId)
    setVisitForm((previous) => ({
      ...previous,
      soin_id: soinId,
      montant: selectedSoin ? selectedSoin.prix : previous.montant,
      points_attribues: selectedSoin
        ? Math.round(selectedSoin.prix)
        : previous.points_attribues,
    }))
  }

  function handleCsv(event) {
    const [file] = event.target.files || []
    if (!file) {
      return
    }
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const headers = result.meta.fields || []
        const map = detectColumnMap(
          headers,
          importType === 'clients' ? CLIENT_ALIASES : SOIN_ALIASES,
        )
        setImportRows(result.data || [])
        setImportMap(map)
        setImportStatus(
          `${result.data.length} lignes détectées. Mapping auto prêt (${Object.keys(map).length} colonnes reconnues).`,
        )
      },
      error: (error) => {
        setImportRows([])
        setImportMap({})
        setImportStatus(`Erreur CSV: ${error.message}`)
      },
    })
  }

  function applyImport() {
    if (!importRows.length) {
      setImportStatus('Aucune ligne à importer.')
      return
    }

    if (importType === 'clients') {
      const imported = importRows
        .map((row) => ({
          id: createId('cli'),
          nom: row[importMap.nom] || '',
          email: row[importMap.email] || '',
          tel: row[importMap.tel] || '',
          date_naissance: row[importMap.date_naissance] || '',
          points_cumules: safeNumber(row[importMap.points_cumules]),
          visites_count: safeNumber(row[importMap.visites_count]),
          type_peau: row[importMap.type_peau] || '',
        }))
        .filter((row) => row.nom.trim())

      onDbChange((previous) => ({
        ...previous,
        clients: [...previous.clients, ...imported],
      }))
      setImportStatus(`${imported.length} clients importés.`)
      return
    }

    const importedSoins = importRows
      .map((row) => ({
        id: createId('soin'),
        nom: row[importMap.nom] || '',
        categorie: row[importMap.categorie] || 'Autre',
        prix: safeNumber(row[importMap.prix], 0),
        duree: safeNumber(row[importMap.duree], 60),
        actif: safeBoolean(row[importMap.actif], true),
      }))
      .filter((row) => row.nom.trim())

    onDbChange((previous) => ({
      ...previous,
      soins: [...previous.soins, ...importedSoins],
    }))
    setImportStatus(`${importedSoins.length} soins importés.`)
  }

  function saveSettings(event) {
    event.preventDefault()
    onDbChange((previous) => ({
      ...previous,
      settings: {
        birthdayDiscountPercent: safeNumber(settingsForm.birthdayDiscountPercent),
        bookingUrl: settingsForm.bookingUrl.trim() || previous.settings.bookingUrl,
      },
    }))
  }

  function createInvitation(event) {
    event.preventDefault()
    if (!invitationForm.email.trim()) {
      return
    }
    onDbChange((previous) => ({
      ...previous,
      invitations: [
        ...previous.invitations,
        {
          id: createId('inv'),
          ...invitationForm,
          status: 'pending',
          created_at: new Date().toISOString(),
        },
      ],
    }))
    setInvitationForm(EMPTY_INVITATION)
  }

  function acceptInvitation(invitation) {
    const password = `welcome-${createId('pw').slice(-6)}`
    onDbChange((previous) => ({
      ...previous,
      invitations: previous.invitations.map((candidate) =>
        candidate.id === invitation.id
          ? { ...candidate, status: 'accepted', accepted_at: new Date().toISOString() }
          : candidate,
      ),
      users: [
        ...previous.users,
        {
          id: createId('usr'),
          name: invitation.email.split('@')[0],
          email: invitation.email,
          password,
          role: invitation.role,
          client_id: invitation.client_id || null,
        },
      ],
    }))
  }

  function createUser(event) {
    event.preventDefault()
    if (!userForm.email.trim() || !userForm.password.trim()) {
      return
    }
    onDbChange((previous) => ({
      ...previous,
      users: [
        ...previous.users,
        {
          id: createId('usr'),
          ...userForm,
          client_id: userForm.client_id || null,
        },
      ],
    }))
    setUserForm({ name: '', email: '', password: '', role: ROLE.USER, client_id: '' })
  }

  function updateUserAccess(userId, updates) {
    onDbChange((previous) => ({
      ...previous,
      users: previous.users.map((user) =>
        user.id === userId ? { ...user, ...updates } : user,
      ),
    }))
  }

  const tabs = [
    { id: 'clients', label: 'Clients' },
    { id: 'soins', label: 'Soins' },
    { id: 'visites', label: 'Ajouter une visite' },
    { id: 'import', label: 'Import CSV' },
    { id: 'settings', label: 'Config' },
    { id: 'access', label: 'Droits & invitations' },
  ]

  return (
    <main className="space-y-4 pb-6">
      <section className="grid gap-3 sm:grid-cols-3">
        <article className="lux-card p-4">
          <p className="text-xs uppercase tracking-wider text-[--lux-muted]">Clients</p>
          <p className="mt-1 text-2xl font-semibold">{db.clients.length}</p>
        </article>
        <article className="lux-card p-4">
          <p className="text-xs uppercase tracking-wider text-[--lux-muted]">Visites</p>
          <p className="mt-1 text-2xl font-semibold">{db.visites.length}</p>
        </article>
        <article className="lux-card p-4">
          <p className="text-xs uppercase tracking-wider text-[--lux-muted]">Soins actifs</p>
          <p className="mt-1 text-2xl font-semibold">
            {db.soins.filter((soin) => soin.actif).length}
          </p>
        </article>
      </section>

      <nav className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`lux-btn whitespace-nowrap ${
              tab === item.id ? 'lux-btn-accent' : 'lux-btn-ghost'
            }`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === 'clients' ? (
        <section className="grid gap-4 lg:grid-cols-[1.1fr_1.9fr]">
          <article className="lux-card p-4">
            <h2 className="serif-title text-xl text-[#2f2419]">
              {clientEditId ? 'Modifier client' : 'Nouveau client'}
            </h2>
            <form className="mt-3 space-y-2" onSubmit={saveClient}>
              <input
                className="lux-input"
                placeholder="Nom"
                value={clientForm.nom}
                onChange={(event) =>
                  setClientForm((previous) => ({ ...previous, nom: event.target.value }))
                }
              />
              <input
                className="lux-input"
                placeholder="Email"
                type="email"
                value={clientForm.email}
                onChange={(event) =>
                  setClientForm((previous) => ({ ...previous, email: event.target.value }))
                }
              />
              <input
                className="lux-input"
                placeholder="Téléphone"
                value={clientForm.tel}
                onChange={(event) =>
                  setClientForm((previous) => ({ ...previous, tel: event.target.value }))
                }
              />
              <input
                className="lux-input"
                type="date"
                value={clientForm.date_naissance}
                onChange={(event) =>
                  setClientForm((previous) => ({
                    ...previous,
                    date_naissance: event.target.value,
                  }))
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="lux-input"
                  placeholder="Points"
                  type="number"
                  value={clientForm.points_cumules}
                  onChange={(event) =>
                    setClientForm((previous) => ({
                      ...previous,
                      points_cumules: event.target.value,
                    }))
                  }
                />
                <input
                  className="lux-input"
                  placeholder="Visites"
                  type="number"
                  value={clientForm.visites_count}
                  onChange={(event) =>
                    setClientForm((previous) => ({
                      ...previous,
                      visites_count: event.target.value,
                    }))
                  }
                />
              </div>
              <input
                className="lux-input"
                placeholder="Type de peau"
                value={clientForm.type_peau}
                onChange={(event) =>
                  setClientForm((previous) => ({
                    ...previous,
                    type_peau: event.target.value,
                  }))
                }
              />
              <div className="mt-3 flex gap-2">
                <button className="lux-btn lux-btn-accent" type="submit">
                  {clientEditId ? 'Mettre à jour' : 'Créer'}
                </button>
                {clientEditId ? (
                  <button
                    type="button"
                    className="lux-btn lux-btn-ghost"
                    onClick={() => {
                      setClientEditId(null)
                      setClientForm(EMPTY_CLIENT)
                    }}
                  >
                    Annuler
                  </button>
                ) : null}
              </div>
            </form>
          </article>

          <article className="lux-card p-4">
            <h2 className="serif-title text-xl text-[#2f2419]">Liste clients</h2>
            <div className="mt-3 space-y-2">
              {db.clients.map((client) => (
                <div
                  key={client.id}
                  className="rounded-xl border border-[--lux-border] bg-white p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{client.nom}</p>
                      <p className="text-sm text-[--lux-muted]">
                        {client.email || 'Email non renseigné'} · {client.tel || 'Sans tel'}
                      </p>
                    </div>
                    <div className="text-right text-sm text-[--lux-muted]">
                      <p>{client.visites_count} visites</p>
                      <p>{client.points_cumules} pts</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      className="lux-btn lux-btn-primary text-sm"
                      onClick={() => editClient(client)}
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      className="lux-btn lux-btn-ghost text-sm"
                      onClick={() => deleteClient(client.id)}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      {tab === 'soins' ? (
        <section className="grid gap-4 lg:grid-cols-[1.1fr_1.9fr]">
          <article className="lux-card p-4">
            <h2 className="serif-title text-xl text-[#2f2419]">
              {soinEditId ? 'Modifier soin' : 'Nouveau soin'}
            </h2>
            <form className="mt-3 space-y-2" onSubmit={saveSoin}>
              <input
                className="lux-input"
                placeholder="Nom du soin"
                value={soinForm.nom}
                onChange={(event) =>
                  setSoinForm((previous) => ({ ...previous, nom: event.target.value }))
                }
              />
              <input
                className="lux-input"
                placeholder="Catégorie"
                value={soinForm.categorie}
                onChange={(event) =>
                  setSoinForm((previous) => ({
                    ...previous,
                    categorie: event.target.value,
                  }))
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="lux-input"
                  placeholder="Prix €"
                  type="number"
                  value={soinForm.prix}
                  onChange={(event) =>
                    setSoinForm((previous) => ({ ...previous, prix: event.target.value }))
                  }
                />
                <input
                  className="lux-input"
                  placeholder="Durée (min)"
                  type="number"
                  value={soinForm.duree}
                  onChange={(event) =>
                    setSoinForm((previous) => ({
                      ...previous,
                      duree: event.target.value,
                    }))
                  }
                />
              </div>
              <label className="mt-1 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(soinForm.actif)}
                  onChange={(event) =>
                    setSoinForm((previous) => ({
                      ...previous,
                      actif: event.target.checked,
                    }))
                  }
                />
                Soin actif
              </label>
              <div className="mt-3 flex gap-2">
                <button className="lux-btn lux-btn-accent" type="submit">
                  {soinEditId ? 'Mettre à jour' : 'Créer'}
                </button>
                {soinEditId ? (
                  <button
                    type="button"
                    className="lux-btn lux-btn-ghost"
                    onClick={() => {
                      setSoinEditId(null)
                      setSoinForm(EMPTY_SOIN)
                    }}
                  >
                    Annuler
                  </button>
                ) : null}
              </div>
            </form>
          </article>

          <article className="lux-card p-4">
            <h2 className="serif-title text-xl text-[#2f2419]">Catalogue interne</h2>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {db.soins.map((soin) => (
                <div
                  key={soin.id}
                  className="rounded-xl border border-[--lux-border] bg-white p-3"
                >
                  <p className="font-semibold">{soin.nom}</p>
                  <p className="text-sm text-[--lux-muted]">{soin.categorie}</p>
                  <p className="mt-2 text-sm">
                    {formatCurrency(soin.prix)} · {soin.duree} min
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-[--lux-muted]">
                    {soin.actif ? 'Actif' : 'Inactif'}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      className="lux-btn lux-btn-primary text-sm"
                      onClick={() => editSoin(soin)}
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      className="lux-btn lux-btn-ghost text-sm"
                      onClick={() => deleteSoin(soin.id)}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      {tab === 'visites' ? (
        <section className="grid gap-4 lg:grid-cols-[1.1fr_1.9fr]">
          <article className="lux-card p-4">
            <h2 className="serif-title text-xl text-[#2f2419]">Ajouter une visite</h2>
            <form className="mt-3 space-y-2" onSubmit={addVisit}>
              <select
                className="lux-input"
                value={visitForm.client_id || db.clients[0]?.id || ''}
                onChange={(event) =>
                  setVisitForm((previous) => ({
                    ...previous,
                    client_id: event.target.value,
                  }))
                }
              >
                <option value="">Sélectionner un client</option>
                {db.clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.nom}
                  </option>
                ))}
              </select>
              <select
                className="lux-input"
                value={visitForm.soin_id || db.soins[0]?.id || ''}
                onChange={(event) => onSoinSelect(event.target.value)}
              >
                <option value="">Sélectionner un soin</option>
                {db.soins.map((soin) => (
                  <option key={soin.id} value={soin.id}>
                    {soin.nom}
                  </option>
                ))}
              </select>
              <input
                className="lux-input"
                type="date"
                value={visitForm.date}
                onChange={(event) =>
                  setVisitForm((previous) => ({ ...previous, date: event.target.value }))
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="lux-input"
                  type="number"
                  value={visitForm.montant}
                  placeholder="Montant"
                  onChange={(event) =>
                    setVisitForm((previous) => ({
                      ...previous,
                      montant: event.target.value,
                    }))
                  }
                />
                <input
                  className="lux-input"
                  type="number"
                  value={visitForm.points_attribues}
                  placeholder="Points"
                  onChange={(event) =>
                    setVisitForm((previous) => ({
                      ...previous,
                      points_attribues: event.target.value,
                    }))
                  }
                />
              </div>
              <button type="submit" className="lux-btn lux-btn-accent">
                Enregistrer la visite
              </button>
              {visitMessage ? <p className="text-sm text-emerald-700">{visitMessage}</p> : null}
            </form>
          </article>

          <article className="lux-card p-4">
            <h2 className="serif-title text-xl text-[#2f2419]">Visites récentes</h2>
            <div className="mt-3 space-y-2">
              {db.visites
                .slice()
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 12)
                .map((visit) => {
                  const client = db.clients.find((item) => item.id === visit.client_id)
                  const soin = db.soins.find((item) => item.id === visit.soin_id)
                  return (
                    <div
                      key={visit.id}
                      className="rounded-xl border border-[--lux-border] bg-white p-3 text-sm"
                    >
                      <p className="font-semibold">{client?.nom || 'Client supprimé'}</p>
                      <p className="text-[--lux-muted]">
                        {soin?.nom || 'Soin supprimé'} · {visit.date}
                      </p>
                      <p className="mt-1">
                        {formatCurrency(visit.montant)} · {visit.points_attribues} points
                      </p>
                    </div>
                  )
                })}
            </div>
          </article>
        </section>
      ) : null}

      {tab === 'import' ? (
        <section className="lux-card p-4">
          <h2 className="serif-title text-xl text-[#2f2419]">Import CSV</h2>
          <p className="mt-1 text-sm text-[--lux-muted]">
            Mapping colonnes automatique pour Clients et Soins.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className={`lux-btn ${importType === 'clients' ? 'lux-btn-accent' : 'lux-btn-ghost'}`}
              onClick={() => {
                setImportType('clients')
                setImportRows([])
                setImportMap({})
                setImportStatus('')
              }}
            >
              Import Clients
            </button>
            <button
              type="button"
              className={`lux-btn ${importType === 'soins' ? 'lux-btn-accent' : 'lux-btn-ghost'}`}
              onClick={() => {
                setImportType('soins')
                setImportRows([])
                setImportMap({})
                setImportStatus('')
              }}
            >
              Import Soins
            </button>
          </div>
          <input className="mt-3 block w-full text-sm" type="file" accept=".csv" onChange={handleCsv} />
          <div className="mt-3 rounded-xl border border-dashed border-[--lux-border] p-3 text-sm">
            <p className="font-medium">Colonnes reconnues</p>
            <pre className="mt-1 overflow-x-auto text-xs text-[--lux-muted]">
              {JSON.stringify(importMap, null, 2)}
            </pre>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button className="lux-btn lux-btn-accent" type="button" onClick={applyImport}>
              Appliquer l&apos;import
            </button>
            <p className="text-sm text-[--lux-muted]">{importStatus}</p>
          </div>
        </section>
      ) : null}

      {tab === 'settings' ? (
        <section className="grid gap-4 lg:grid-cols-[1.2fr_1.8fr]">
          <article className="lux-card p-4">
            <h2 className="serif-title text-xl text-[#2f2419]">Config Anniversaire</h2>
            <form className="mt-3 space-y-2" onSubmit={saveSettings}>
              <label className="block text-sm text-[--lux-muted]">
                % remise auto (jour d&apos;anniversaire)
                <input
                  className="lux-input mt-1"
                  type="number"
                  min="0"
                  max="100"
                  value={settingsForm.birthdayDiscountPercent}
                  onChange={(event) =>
                    setSettingsForm((previous) => ({
                      ...previous,
                      birthdayDiscountPercent: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="block text-sm text-[--lux-muted]">
                Lien de réservation externe
                <input
                  className="lux-input mt-1"
                  type="url"
                  value={settingsForm.bookingUrl}
                  onChange={(event) =>
                    setSettingsForm((previous) => ({
                      ...previous,
                      bookingUrl: event.target.value,
                    }))
                  }
                />
              </label>
              <button className="lux-btn lux-btn-accent" type="submit">
                Enregistrer la configuration
              </button>
            </form>
          </article>
          <article className="lux-card p-4">
            <h2 className="serif-title text-xl text-[#2f2419]">Paliers de récompenses</h2>
            <ul className="mt-3 space-y-2">
              {rewardTarget.map((reward) => (
                <li
                  key={reward.id}
                  className="rounded-xl border border-[--lux-border] bg-white p-3"
                >
                  <p className="font-semibold">{reward.nom}</p>
                  <p className="text-sm text-[--lux-muted]">
                    À {reward.palier_visites} visites · {reward.pourcentage_reduction}% de
                    réduction
                  </p>
                </li>
              ))}
            </ul>
          </article>
        </section>
      ) : null}

      {tab === 'access' ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <article className="lux-card p-4">
            <h2 className="serif-title text-xl text-[#2f2419]">Créer un accès</h2>
            <form className="mt-3 space-y-2" onSubmit={createUser}>
              <input
                className="lux-input"
                placeholder="Nom"
                value={userForm.name}
                onChange={(event) =>
                  setUserForm((previous) => ({ ...previous, name: event.target.value }))
                }
              />
              <input
                className="lux-input"
                placeholder="Email"
                type="email"
                value={userForm.email}
                onChange={(event) =>
                  setUserForm((previous) => ({ ...previous, email: event.target.value }))
                }
              />
              <input
                className="lux-input"
                placeholder="Mot de passe"
                value={userForm.password}
                onChange={(event) =>
                  setUserForm((previous) => ({ ...previous, password: event.target.value }))
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  className="lux-input"
                  value={userForm.role}
                  onChange={(event) =>
                    setUserForm((previous) => ({ ...previous, role: event.target.value }))
                  }
                >
                  <option value={ROLE.USER}>USER</option>
                  <option value={ROLE.ADMIN}>ADMIN</option>
                </select>
                <select
                  className="lux-input"
                  value={userForm.client_id}
                  onChange={(event) =>
                    setUserForm((previous) => ({
                      ...previous,
                      client_id: event.target.value,
                    }))
                  }
                >
                  <option value="">Aucun client lié</option>
                  {db.clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.nom}
                    </option>
                  ))}
                </select>
              </div>
              <button className="lux-btn lux-btn-accent" type="submit">
                Créer l&apos;utilisateur
              </button>
            </form>

            <h3 className="serif-title mt-6 text-lg text-[#2f2419]">Gestion des droits</h3>
            <div className="mt-2 space-y-2">
              {db.users.map((user) => (
                <div
                  key={user.id}
                  className="rounded-xl border border-[--lux-border] bg-white p-3"
                >
                  <p className="font-semibold">{user.name || user.email}</p>
                  <p className="text-xs text-[--lux-muted]">{user.email}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <select
                      className="lux-input text-sm"
                      value={user.role}
                      onChange={(event) =>
                        updateUserAccess(user.id, {
                          role: event.target.value,
                        })
                      }
                    >
                      <option value={ROLE.USER}>USER</option>
                      <option value={ROLE.ADMIN}>ADMIN</option>
                    </select>
                    <select
                      className="lux-input text-sm"
                      value={user.client_id || ''}
                      onChange={(event) =>
                        updateUserAccess(user.id, {
                          client_id: event.target.value || null,
                        })
                      }
                    >
                      <option value="">Aucun client</option>
                      {db.clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="lux-card p-4">
            <h2 className="serif-title text-xl text-[#2f2419]">Inviter un client</h2>
            <p className="text-sm text-[--lux-muted]">
              Les invitations et droits sont gérés directement dans l&apos;UI.
            </p>
            <form className="mt-3 space-y-2" onSubmit={createInvitation}>
              <input
                className="lux-input"
                placeholder="Email d'invitation"
                type="email"
                value={invitationForm.email}
                onChange={(event) =>
                  setInvitationForm((previous) => ({
                    ...previous,
                    email: event.target.value,
                  }))
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  className="lux-input"
                  value={invitationForm.role}
                  onChange={(event) =>
                    setInvitationForm((previous) => ({
                      ...previous,
                      role: event.target.value,
                    }))
                  }
                >
                  <option value={ROLE.USER}>USER</option>
                  <option value={ROLE.ADMIN}>ADMIN</option>
                </select>
                <select
                  className="lux-input"
                  value={invitationForm.client_id}
                  onChange={(event) =>
                    setInvitationForm((previous) => ({
                      ...previous,
                      client_id: event.target.value,
                    }))
                  }
                >
                  <option value="">Aucun client lié</option>
                  {db.clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.nom}
                    </option>
                  ))}
                </select>
              </div>
              <button className="lux-btn lux-btn-accent" type="submit">
                Créer l&apos;invitation
              </button>
            </form>

            <h3 className="serif-title mt-6 text-lg text-[#2f2419]">Historique invitations</h3>
            <div className="mt-2 space-y-2">
              {db.invitations.length === 0 ? (
                <p className="text-sm text-[--lux-muted]">Aucune invitation pour le moment.</p>
              ) : null}
              {db.invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="rounded-xl border border-[--lux-border] bg-white p-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{invitation.email}</p>
                      <p className="text-xs text-[--lux-muted]">
                        {invitation.role} · {invitation.status}
                      </p>
                    </div>
                    {invitation.status === 'pending' ? (
                      <button
                        type="button"
                        className="lux-btn lux-btn-primary text-sm"
                        onClick={() => acceptInvitation(invitation)}
                      >
                        Simuler acceptation
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}
    </main>
  )
}

function ClientSpace({ db, user }) {
  const client = db.clients.find((candidate) => candidate.id === user.client_id)

  const clientVisits = useMemo(() => {
    return db.visites
      .filter((visit) => visit.client_id === user.client_id)
      .sort((first, second) => new Date(second.date) - new Date(first.date))
  }, [db.visites, user.client_id])

  const activeSoins = useMemo(() => {
    return db.soins.filter((soin) => soin.actif)
  }, [db.soins])

  const rewards = useMemo(() => {
    return [...db.recompenses].sort((a, b) => a.palier_visites - b.palier_visites)
  }, [db.recompenses])

  const nextReward = rewards.find((reward) => reward.palier_visites > (client?.visites_count || 0))
  const achievedRewards = rewards.filter(
    (reward) => reward.palier_visites <= (client?.visites_count || 0),
  )
  const previousTarget = achievedRewards.at(-1)?.palier_visites || 0
  const nextTarget = nextReward?.palier_visites || previousTarget || 1
  const progress = Math.min(
    100,
    Math.round(
      (((client?.visites_count || 0) - previousTarget) /
        Math.max(nextTarget - previousTarget, 1)) *
        100,
    ),
  )
  const birthdayDiscount = computeBirthdayDiscount(client, db.settings)

  if (!client) {
    return (
      <main className="lux-card p-6">
        <h2 className="serif-title text-xl text-[#2f2419]">Espace client indisponible</h2>
        <p className="mt-2 text-sm text-[--lux-muted]">
          Votre compte n&apos;est pas encore lié à une fiche cliente.
        </p>
      </main>
    )
  }

  return (
    <main className="space-y-4 pb-8">
      <section className="lux-card p-4 sm:p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-[--lux-muted]">
          Carte de fidélité digitale
        </p>
        <h2 className="serif-title mt-1 text-2xl text-[#2f2419]">{client.nom}</h2>
        <p className="mt-1 text-sm text-[--lux-muted]">
          Type de peau: {client.type_peau || 'Non renseigné'} · {client.points_cumules} points
        </p>

        {birthdayDiscount > 0 ? (
          <p className="mt-2 rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-800">
            Joyeux anniversaire ! {birthdayDiscount}% de remise automatique aujourd&apos;hui.
          </p>
        ) : null}

        <div className="mt-4">
          <div className="mb-1 flex justify-between text-sm">
            <span>{client.visites_count} visites</span>
            <span>
              {nextReward
                ? `Prochain palier: ${nextReward.palier_visites}`
                : 'Tous les paliers sont débloqués'}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-[#efe5d9]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#c4a77d] to-[#b58d5d]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {rewards.map((reward) => {
            const unlocked = client.visites_count >= reward.palier_visites
            return (
              <article
                key={reward.id}
                className={`rounded-xl border p-3 ${
                  unlocked
                    ? 'border-amber-300 bg-amber-50'
                    : 'border-[--lux-border] bg-white'
                }`}
              >
                <p className="text-sm font-semibold">{reward.nom}</p>
                <p className="text-xs text-[--lux-muted]">
                  {reward.palier_visites} visites · {reward.pourcentage_reduction}% remise
                </p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="lux-card p-4">
          <h3 className="serif-title text-xl text-[#2f2419]">Historique des soins</h3>
          <div className="mt-3 space-y-2">
            {clientVisits.length === 0 ? (
              <p className="text-sm text-[--lux-muted]">Aucun soin enregistré.</p>
            ) : null}
            {clientVisits.map((visit) => {
              const soin = db.soins.find((item) => item.id === visit.soin_id)
              return (
                <div
                  key={visit.id}
                  className="rounded-xl border border-[--lux-border] bg-white p-3"
                >
                  <p className="font-semibold">{soin?.nom || 'Soin supprimé'}</p>
                  <p className="text-sm text-[--lux-muted]">{visit.date}</p>
                  <p className="mt-1 text-sm">
                    {formatCurrency(visit.montant)} · +{visit.points_attribues} points
                  </p>
                </div>
              )
            })}
          </div>
        </article>

        <article className="lux-card p-4">
          <h3 className="serif-title text-xl text-[#2f2419]">Catalogue des soins</h3>
          <div className="mt-3 space-y-2">
            {activeSoins.map((soin) => (
              <div
                key={soin.id}
                className="rounded-xl border border-[--lux-border] bg-white p-3"
              >
                <p className="font-semibold">{soin.nom}</p>
                <p className="text-sm text-[--lux-muted]">{soin.categorie}</p>
                <p className="mt-1 text-sm">
                  {formatCurrency(soin.prix)} · {soin.duree} min
                </p>
                <a
                  className="lux-btn lux-btn-accent mt-3 inline-block text-sm"
                  href={db.settings.bookingUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Réserver
                </a>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  )
}

export default App
