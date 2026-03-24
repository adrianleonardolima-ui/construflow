import React, { useMemo, useState, useEffect } from "react";
import {
  AlertTriangle, Building2, CheckCircle2, Clock3,
  FolderKanban, Home, Package, Plus, Search,
  Wallet, X, Menu, Filter, Edit, Trash2, ThumbsUp, ThumbsDown, DollarSign, Lock, RefreshCcw, ShieldAlert, FileCheck, Calculator
} from "lucide-react";

// --- FIREBASE IMPORTS E INICIALIZAÇÃO ---
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";

const isPreview = typeof __firebase_config !== 'undefined';

// CONFIGURAÇÃO OFICIAL DO SEU FIREBASE (Para quando rodar no seu computador/Netlify)
const customFirebaseConfig = {
  apiKey: "AIzaSyA2uRLCKTzttl_aNv1rXboO9jvIctPbGOc",
  authDomain: "construflowbethaville.firebaseapp.com",
  projectId: "construflowbethaville",
  storageBucket: "construflowbethaville.firebasestorage.app",
  messagingSenderId: "265383164675",
  appId: "1:265383164675:web:d7fdfcc1678b51c1950736"
};

const firebaseConfig = isPreview ? JSON.parse(__firebase_config) : customFirebaseConfig;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = isPreview && typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// FUNÇÕES DE CAMINHO (Respeita o ambiente de preview do chat ou o seu banco oficial)
const getColRef = (colName) => {
  return isPreview 
    ? collection(db, 'artifacts', appId, 'public', 'data', colName)
    : collection(db, colName);
};

const getDocRef = (colName, id) => {
  return isPreview 
    ? doc(db, 'artifacts', appId, 'public', 'data', colName, String(id))
    : doc(db, colName, String(id));
};

// --- CONSTANTES ---
const STATUS_OBRA = ["Em andamento", "Atenção", "Planejamento", "Paralisada", "Finalizada"];
const STATUS_DEMANDA = ["Pendente", "Em andamento", "Aguardando aprovação", "Concluído", "Atrasado", "Cancelado", "Reprovado"];
const STATUS_COMPRA = ["Em cotação", "Aguardando aprovação", "Aguardando pagamento", "Comprado", "Entregue parcial", "Entregue total", "Cancelado", "Reprovado"];
const STATUS_PAGAMENTO = ["Pendente", "Aguardando aprovação", "Programado", "Pago", "Vencido", "Cancelado", "Reprovado"];
const PRIORIDADES = ["Baixa", "Média", "Alta", "Urgente", "Crítica"];

// --- UTILITÁRIOS ---
const formatBRL = (valor) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(valor) || 0);
const formatDate = (dateString) => {
  if (!dateString) return "-";
  const [year, month, day] = String(dateString).split("-");
  return `${day}/${month}/${year}`;
};

const getStatusColor = (value) => {
  const map = {
    "Pendente": "bg-amber-100 text-amber-800 border-amber-200",
    "Em andamento": "bg-blue-100 text-blue-800 border-blue-200",
    "Em cotação": "bg-blue-100 text-blue-800 border-blue-200",
    "Atenção": "bg-rose-100 text-rose-800 border-rose-200",
    "Aguardando aprovação": "bg-purple-100 text-purple-800 border-purple-300 shadow-sm shadow-purple-200 font-bold",
    "Aguardando pagamento": "bg-orange-100 text-orange-800 border-orange-200",
    "Programado": "bg-sky-100 text-sky-800 border-sky-200",
    "Atrasado": "bg-red-100 text-red-800 border-red-200",
    "Vencido": "bg-red-100 text-red-800 border-red-200",
    "Concluído": "bg-emerald-100 text-emerald-800 border-emerald-200",
    "Pago": "bg-emerald-100 text-emerald-800 border-emerald-200",
    "Comprado": "bg-emerald-100 text-emerald-800 border-emerald-200",
    "Alta": "bg-orange-100 text-orange-800 border-orange-200",
    "Crítica": "bg-red-200 text-red-900 border-red-300 font-bold",
    "Reprovado": "bg-red-100 text-red-800 border-red-200",
  };
  return map[value] || "bg-slate-100 text-slate-700 border-slate-200";
};

// --- COMPONENTES DE UI ---
const Badge = ({ value, className = "" }) => (
  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusColor(value)} ${className}`}>{value}</span>
);

const Card = ({ children, className = "", onClick, id }) => (
  <div id={id} onClick={onClick} className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}>{children}</div>
);

const Button = ({ children, variant = "primary", icon: Icon, className = "", ...props }) => {
  const base = "inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all active:scale-95";
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-200",
    outline: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    danger: "text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 bg-white",
    ghost: "text-slate-600 hover:bg-slate-100",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
};

const Input = ({ label, ...props }) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
    <input className="w-full px-3 py-2 bg-slate-50/50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" {...props} />
  </div>
);

const Select = ({ label, options, value, onChange, disabled }) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      disabled={disabled}
      className={`w-full px-3 py-2 bg-slate-50/50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${disabled ? 'opacity-70 cursor-not-allowed bg-slate-100' : ''}`}
    >
      <option value="">Selecione...</option>
      {options.map(opt => (
        <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
          {typeof opt === 'string' ? opt : opt.label}
        </option>
      ))}
    </select>
  </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};

// --- APP PRINCIPAL ---
export default function ConstrutoraPainel() {
  const [user, setUser] = useState(null);
  const [firebaseAuthError, setFirebaseAuthError] = useState(null);
  const [telaAtiva, setTelaAtiva] = useState("dashboard");
  const [menuMobileOpen, setMenuMobileOpen] = useState(false);
  const [buscaGeral, setBuscaGeral] = useState("");
  const [filtroObraGlobal, setFiltroObraGlobal] = useState("Todas as Obras");

  // Estados de Dados 
  const [obras, setObras] = useState([]);
  const [demandas, setDemandas] = useState([]);
  const [compras, setCompras] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);
  const [medicoes, setMedicoes] = useState([]);

  // Estados de Modais
  const [modalAtivo, setModalAtivo] = useState(null);
  const [itemEditando, setItemEditando] = useState(null);

  // Estados do Modal de Senha (Exclusão Definitiva - Gestor)
  const [modalSenha, setModalSenha] = useState({ isOpen: false, id: null, tipo: null });
  const [senhaInput, setSenhaInput] = useState("");
  const [erroSenha, setErroSenha] = useState("");

  // Estados do Modal de AVALIAÇÃO (Gestor)
  const [modalAvaliacao, setModalAvaliacao] = useState({ isOpen: false, item: null, tipo: null });
  const [avalForm, setAvalForm] = useState({ decisao: 'aprovar', data: '', justificativa: '', senha: '' });

  // Modal de Confirmação de Exclusão (Lixeira)
  const [modalConfirmarExclusao, setModalConfirmarExclusao] = useState({ isOpen: false, id: null, tipo: null });

  // --- CONFIGURAÇÃO FIREBASE ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Erro ao autenticar no Firebase:", error);
        setFirebaseAuthError(error.message);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const errorLogger = (col) => (error) => console.error(`Erro a buscar ${col}:`, error);

    const unsubObras = onSnapshot(getColRef('obras'), 
      (snap) => setObras(snap.docs.map(doc => ({ ...doc.data(), id: doc.id }))), errorLogger('obras'));

    const unsubDemandas = onSnapshot(getColRef('demandas'), 
      (snap) => setDemandas(snap.docs.map(doc => ({ ...doc.data(), id: doc.id }))), errorLogger('demandas'));

    const unsubCompras = onSnapshot(getColRef('compras'), 
      (snap) => setCompras(snap.docs.map(doc => ({ ...doc.data(), id: doc.id }))), errorLogger('compras'));

    const unsubPagamentos = onSnapshot(getColRef('pagamentos'), 
      (snap) => setPagamentos(snap.docs.map(doc => ({ ...doc.data(), id: doc.id }))), errorLogger('pagamentos'));

    const unsubMedicoes = onSnapshot(getColRef('medicoes'), 
      (snap) => setMedicoes(snap.docs.map(doc => ({ ...doc.data(), id: doc.id }))), errorLogger('medicoes'));

    return () => { unsubObras(); unsubDemandas(); unsubCompras(); unsubPagamentos(); unsubMedicoes(); };
  }, [user]);

  // --- FILTROS E AGRUPAMENTOS ---
  const nomesObras = useMemo(() => obras.filter(o => !o.exclusaoPendente).map(o => o.nome), [obras]);

  const exclusoesPendentes = useMemo(() => {
    return [
      ...obras.filter(o => o.exclusaoPendente).map(o => ({...o, tipoLogico: 'obra', tituloExibicao: o.nome, icone: Building2})),
      ...demandas.filter(d => d.exclusaoPendente).map(d => ({...d, tipoLogico: 'demanda', tituloExibicao: d.titulo, icone: FolderKanban})),
      ...compras.filter(c => c.exclusaoPendente).map(c => ({...c, tipoLogico: 'compra', tituloExibicao: c.item, icone: Package})),
      ...pagamentos.filter(p => p.exclusaoPendente).map(p => ({...p, tipoLogico: 'pagamento', tituloExibicao: p.favorecido, icone: DollarSign})),
      ...medicoes.filter(m => m.exclusaoPendente).map(m => ({...m, tipoLogico: 'medicao', tituloExibicao: `Medição - ${m.obra} (${formatDate(m.dataMedicao)})`, icone: Calculator})),
    ];
  }, [obras, demandas, compras, pagamentos, medicoes]);

  const aplicarFiltros = (lista, camposBusca) => {
    return lista.filter(item => {
      if (item.exclusaoPendente) return false;
      const matchObra = filtroObraGlobal === "Todas as Obras" || item.obra === filtroObraGlobal || item.nome === filtroObraGlobal;
      const matchBusca = buscaGeral === "" || camposBusca.some(campo => String(item[campo] || "").toLowerCase().includes(buscaGeral.toLowerCase()));
      return matchObra && matchBusca;
    });
  };

  const obrasFiltradas = useMemo(() => aplicarFiltros(obras, ["nome", "cidade", "responsavel", "cliente", "status"]), [obras, buscaGeral, filtroObraGlobal]);
  const demandasFiltradas = useMemo(() => aplicarFiltros(demandas, ["titulo", "responsavel", "setor", "status", "prioridade"]), [demandas, buscaGeral, filtroObraGlobal]);
  const comprasFiltradas = useMemo(() => aplicarFiltros(compras, ["item", "responsavel", "status", "urgencia"]), [compras, buscaGeral, filtroObraGlobal]);
  const pagamentosFiltrados = useMemo(() => aplicarFiltros(pagamentos, ["favorecido", "categoria", "status"]), [pagamentos, buscaGeral, filtroObraGlobal]);
  const medicoesFiltradas = useMemo(() => aplicarFiltros(medicoes, ["obra", "bancoPago", "statusFiscal", "nfEmitida"]), [medicoes, buscaGeral, filtroObraGlobal]);

  const aprovaçõesPendentes = useMemo(() => {
    const comprasAprov = comprasFiltradas.filter(c => c.status === "Aguardando aprovação").map(c => ({...c, tipoAprovacao: 'compra'}));
    const pagAprov = pagamentosFiltrados.filter(p => p.status === "Aguardando aprovação").map(p => ({...p, tipoAprovacao: 'pagamento'}));
    const demAprov = demandasFiltradas.filter(d => d.status === "Aguardando aprovação").map(d => ({...d, tipoAprovacao: 'demanda'}));
    return [...comprasAprov, ...pagAprov, ...demAprov];
  }, [comprasFiltradas, pagamentosFiltrados, demandasFiltradas]);

  const MENU_ITEMS = [
    { key: "dashboard", label: "Dashboard", icon: Home },
    { key: "obras", label: "Obras", icon: Building2 },
    { key: "demandas", label: "Demandas", icon: FolderKanban },
    { key: "compras", label: "Compras", icon: Package },
    { key: "pagamentos", label: "Financeiro", icon: Wallet },
    { key: "medicoes", label: "Medições", icon: Calculator },
    { key: "exclusoes", label: "Lixeira / Exclusões", icon: ShieldAlert, badge: exclusoesPendentes.length },
  ];

  // --- FUNÇÕES DE PERSISTÊNCIA FIREBASE ---
  const getColName = (tipo) => {
    if (tipo === 'obra') return 'obras';
    if (tipo === 'demanda') return 'demandas';
    if (tipo === 'compra') return 'compras';
    if (tipo === 'pagamento') return 'pagamentos';
    if (tipo === 'medicao') return 'medicoes';
    return '';
  };

  const updateItemFirebase = async (tipo, id, changes) => {
    if (!user) return;
    try {
      const docRef = getDocRef(getColName(tipo), id);
      await setDoc(docRef, changes, { merge: true });
    } catch (e) { console.error("Erro ao atualizar item", e); }
  };

  const deleteItemFirebase = async (tipo, id) => {
    if (!user) return;
    try {
      const docRef = getDocRef(getColName(tipo), id);
      await deleteDoc(docRef);
    } catch (e) { console.error("Erro ao excluir item", e); }
  };

  const salvarItem = async (tipo, formData) => {
    if (!user) return;
    try {
      const isEdit = !!itemEditando;
      const id = isEdit ? String(itemEditando.id) : crypto.randomUUID();
      const docRef = getDocRef(getColName(tipo), id);
      
      const dataToSave = isEdit ? { ...itemEditando, ...formData } : { id, exclusaoPendente: false, ...formData };
      await setDoc(docRef, dataToSave);
      fecharModal();
    } catch (e) { console.error("Erro ao salvar item", e); }
  };

  // --- FLUXOS COMUNS E GESTOR ---
  const abrirModalAvaliacao = (item, tipo) => {
    setModalAvaliacao({ isOpen: true, item, tipo });
    setAvalForm({ decisao: 'aprovar', data: item.vencimento || item.dataProgramada || '', justificativa: '', senha: '' });
    setErroSenha("");
  };

  const confirmarAvaliacao = async () => {
    if (avalForm.senha !== "Alpha@2026") return setErroSenha("Senha incorreta. Acesso negado.");
    
    const { item, tipo } = modalAvaliacao;
    const isAprovar = avalForm.decisao === 'aprovar';

    if (!isAprovar && avalForm.justificativa.trim() === "") return setErroSenha("A justificativa é obrigatória para reprovações.");
    if (isAprovar && (tipo === 'pagamento' || tipo === 'compra') && !avalForm.data) return setErroSenha("A data de programação é obrigatória para aprovações.");

    if (tipo === 'pagamento') {
      await updateItemFirebase('pagamento', item.id, {
        status: isAprovar ? "Programado" : "Reprovado",
        vencimento: isAprovar ? avalForm.data : item.vencimento,
        justificativa: !isAprovar ? avalForm.justificativa : ""
      });
    } else if (tipo === 'compra') {
      await updateItemFirebase('compra', item.id, {
        status: isAprovar ? "Aguardando pagamento" : "Reprovado",
        dataProgramada: isAprovar ? avalForm.data : item.dataProgramada,
        justificativa: !isAprovar ? avalForm.justificativa : ""
      });
    } else if (tipo === 'demanda') {
      await updateItemFirebase('demanda', item.id, {
        status: isAprovar ? "Em andamento" : "Reprovado",
        justificativa: !isAprovar ? avalForm.justificativa : ""
      });
    }

    setModalAvaliacao({ isOpen: false, item: null, tipo: null });
  };

  const solicitarExclusaoDefinitiva = (id, tipo) => {
    setSenhaInput(""); setErroSenha("");
    setModalSenha({ isOpen: true, id, tipo });
  };

  const confirmarExclusaoDefinitiva = async () => {
    if (senhaInput !== "Alpha@2026") return setErroSenha("Senha de gestor incorreta. Acesso negado.");
    
    await deleteItemFirebase(modalSenha.tipo, modalSenha.id);
    setModalSenha({ isOpen: false, id: null, tipo: null });
  };

  const solicitarExclusao = (id, tipo) => {
    setModalConfirmarExclusao({ isOpen: true, id, tipo });
  };

  const confirmarEnvioLixeira = async () => {
    const { id, tipo } = modalConfirmarExclusao;
    await updateItemFirebase(tipo, id, { exclusaoPendente: true });
    setModalConfirmarExclusao({ isOpen: false, id: null, tipo: null });
  };

  const restaurarItem = async (id, tipo) => {
    await updateItemFirebase(tipo, id, { exclusaoPendente: false });
  };

  const marcarComoPago = async (id) => await updateItemFirebase('pagamento', id, { status: "Pago" });
  const concluirDemanda = async (id) => await updateItemFirebase('demanda', id, { status: "Concluído" });

  const abrirModal = (tipo, item = null) => { setItemEditando(item); setModalAtivo(tipo); };
  const fecharModal = () => { setModalAtivo(null); setItemEditando(null); };

  // --- FORMS DE CRIAÇÃO ---
  const FormObra = () => {
    const [form, setForm] = useState(itemEditando || { nome: "", cidade: "", cliente: "", responsavel: "", status: "Em andamento", prazo: "" });
    return (
      <div className="grid md:grid-cols-2 gap-5">
        <Input label="Nome da Obra" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} />
        <Input label="Cidade/UF" value={form.cidade} onChange={e => setForm({...form, cidade: e.target.value})} />
        <Input label="Cliente" value={form.cliente} onChange={e => setForm({...form, cliente: e.target.value})} />
        <Input label="Responsável" value={form.responsavel} onChange={e => setForm({...form, responsavel: e.target.value})} />
        <Select label="Status" options={STATUS_OBRA} value={form.status} onChange={v => setForm({...form, status: v})} />
        <Input type="date" label="Prazo Final" value={form.prazo} onChange={e => setForm({...form, prazo: e.target.value})} />
        <div className="md:col-span-2 flex justify-end gap-3 mt-4">
          <Button variant="ghost" onClick={fecharModal}>Cancelar</Button>
          <Button onClick={() => salvarItem('obra', form)}>Salvar Obra</Button>
        </div>
      </div>
    );
  };

  const FormDemanda = () => {
    const [form, setForm] = useState(itemEditando || { titulo: "", obra: "", setor: "", responsavel: "", prazo: "", prioridade: "Média", status: "Aguardando aprovação", impacto: "" });
    return (
      <div className="grid md:grid-cols-2 gap-5">
        <div className="md:col-span-2"><Input label="Título" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} /></div>
        <Select label="Obra" options={nomesObras} value={form.obra} onChange={v => setForm({...form, obra: v})} />
        <Input label="Setor" value={form.setor} onChange={e => setForm({...form, setor: e.target.value})} />
        <Select label="Prioridade" options={PRIORIDADES} value={form.prioridade} onChange={v => setForm({...form, prioridade: v})} />
        <Select label="Status (Automático)" options={STATUS_DEMANDA} value={form.status} onChange={v => setForm({...form, status: v})} disabled={!itemEditando} />
        <Input label="Responsável" value={form.responsavel} onChange={e => setForm({...form, responsavel: e.target.value})} />
        <Input type="date" label="Prazo" value={form.prazo} onChange={e => setForm({...form, prazo: e.target.value})} />
        <div className="md:col-span-2 flex justify-end gap-3 mt-4">
          <Button variant="ghost" onClick={fecharModal}>Cancelar</Button>
          <Button onClick={() => salvarItem('demanda', form)}>Salvar Demanda</Button>
        </div>
      </div>
    );
  };

  const FormCompra = () => {
    const [form, setForm] = useState(itemEditando || { item: "", obra: "", quantidade: "", unidade: "un", urgencia: "Média", status: "Aguardando aprovação", responsavel: "", valorEstimado: "" });
    return (
      <div className="grid md:grid-cols-2 gap-5">
        <div className="md:col-span-2"><Input label="Material / Insumo" value={form.item} onChange={e => setForm({...form, item: e.target.value})} /></div>
        <Select label="Obra" options={nomesObras} value={form.obra} onChange={v => setForm({...form, obra: v})} />
        <Input label="Quantidade" type="number" value={form.quantidade} onChange={e => setForm({...form, quantidade: e.target.value})} />
        <Input label="Unidade Medida (un, sc, m³)" value={form.unidade} onChange={e => setForm({...form, unidade: e.target.value})} />
        <Input label="Valor Estimado (R$ - Opcional)" type="number" value={form.valorEstimado} onChange={e => setForm({...form, valorEstimado: e.target.value})} />
        <Select label="Urgência" options={PRIORIDADES} value={form.urgencia} onChange={v => setForm({...form, urgencia: v})} />
        <Select label="Status (Automático)" options={STATUS_COMPRA} value={form.status} onChange={v => setForm({...form, status: v})} disabled={!itemEditando} />
        <Input label="Comprador Responsável" value={form.responsavel} onChange={e => setForm({...form, responsavel: e.target.value})} />
        
        <div className="md:col-span-2 flex justify-end gap-3 mt-4">
          <Button variant="ghost" onClick={fecharModal}>Cancelar</Button>
          <Button onClick={() => salvarItem('compra', form)}>Salvar Compra</Button>
        </div>
      </div>
    );
  };

  const FormPagamento = () => {
    const [form, setForm] = useState(itemEditando || { favorecido: "", obra: "", valor: "", vencimento: "", status: "Aguardando aprovação", categoria: "" });
    return (
      <div className="grid md:grid-cols-2 gap-5">
        <div className="md:col-span-2"><Input label="Favorecido / Fornecedor" value={form.favorecido} onChange={e => setForm({...form, favorecido: e.target.value})} /></div>
        <Select label="Obra / Centro de Custo" options={nomesObras} value={form.obra} onChange={v => setForm({...form, obra: v})} />
        <Input label="Valor (R$)" type="number" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} />
        <Input type="date" label="Data de Vencimento" value={form.vencimento} onChange={e => setForm({...form, vencimento: e.target.value})} />
        <Select label="Status (Automático)" options={STATUS_PAGAMENTO} value={form.status} onChange={v => setForm({...form, status: v})} disabled={!itemEditando} />
        <Input label="Categoria (Material, Serviço, Taxa)" value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})} />
        <div className="md:col-span-2 flex justify-end gap-3 mt-4">
          <Button variant="ghost" onClick={fecharModal}>Cancelar</Button>
          <Button onClick={() => salvarItem('pagamento', form)}>Salvar Pagamento</Button>
        </div>
      </div>
    );
  };

  const FormMedicao = () => {
    const [form, setForm] = useState(itemEditando || { obra: "", dataMedicao: "", valorPrevisto: "", statusFiscal: "Pendente", valorAprovado: "", nfEmitida: "Não", valorPago: "", dataRecebimento: "", bancoPago: "" });
    return (
      <div className="grid md:grid-cols-2 gap-5">
        <Select label="Obra" options={nomesObras} value={form.obra} onChange={v => setForm({...form, obra: v})} />
        <Input type="date" label="Data da Medição" value={form.dataMedicao} onChange={e => setForm({...form, dataMedicao: e.target.value})} />
        
        <Input label="Valor Previsto (R$)" type="number" value={form.valorPrevisto} onChange={e => setForm({...form, valorPrevisto: e.target.value})} />
        <Select label="Aprovado pelo Fiscal?" options={["Pendente", "Aprovado", "Reprovado"]} value={form.statusFiscal} onChange={v => setForm({...form, statusFiscal: v})} />
        
        <Input label="Valor Aprovado (R$)" type="number" value={form.valorAprovado} onChange={e => setForm({...form, valorAprovado: e.target.value})} />
        <Select label="NF Emitida?" options={["Sim", "Não"]} value={form.nfEmitida} onChange={v => setForm({...form, nfEmitida: v})} />
        
        <Input label="Valor Pago (R$)" type="number" value={form.valorPago} onChange={e => setForm({...form, valorPago: e.target.value})} />
        <Input type="date" label="Data de Recebimento" value={form.dataRecebimento} onChange={e => setForm({...form, dataRecebimento: e.target.value})} />
        
        <div className="md:col-span-2">
          <Input label="Banco Pagador" value={form.bancoPago} onChange={e => setForm({...form, bancoPago: e.target.value})} placeholder="Ex: Bradesco, Itaú..." />
        </div>

        <div className="md:col-span-2 flex justify-end gap-3 mt-4">
          <Button variant="ghost" onClick={fecharModal}>Cancelar</Button>
          <Button onClick={() => salvarItem('medicao', form)}>Salvar Medição</Button>
        </div>
      </div>
    );
  };

  // --- RENDERIZADORES DE TELAS ---
  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Visão Geral</h1>
        <p className="text-slate-500 mt-1">Acompanhe indicadores e pendências do sistema.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5 bg-blue-50 border-blue-100 cursor-pointer" onClick={() => setTelaAtiva("obras")}>
          <div className="flex justify-between items-start"><div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><Building2 className="w-5 h-5"/></div></div>
          <h3 className="text-3xl font-bold text-slate-900 mt-4">{obrasFiltradas.length}</h3>
          <p className="text-sm font-medium text-slate-500">Obras Ativas</p>
        </Card>
        <Card className="p-5 bg-purple-50 border-purple-100 cursor-pointer" onClick={() => document.getElementById("aprovacoes_widget")?.scrollIntoView({behavior: "smooth"})}>
          <div className="flex justify-between items-start"><div className="p-2 bg-purple-100 text-purple-600 rounded-xl"><CheckCircle2 className="w-5 h-5"/></div></div>
          <h3 className="text-3xl font-bold text-slate-900 mt-4">{aprovaçõesPendentes.length}</h3>
          <p className="text-sm font-medium text-slate-500">Para Analisar</p>
        </Card>
        <Card className="p-5 bg-orange-50 border-orange-100 cursor-pointer" onClick={() => setTelaAtiva("pagamentos")}>
          <div className="flex justify-between items-start"><div className="p-2 bg-orange-100 text-orange-600 rounded-xl"><Wallet className="w-5 h-5"/></div></div>
          <h3 className="text-3xl font-bold text-slate-900 mt-4">{pagamentosFiltrados.filter(p => p.status !== "Pago" && p.status !== "Reprovado").length}</h3>
          <p className="text-sm font-medium text-slate-500">Pagtos Pendentes</p>
        </Card>
        <Card className="p-5 bg-indigo-50 border-indigo-100 cursor-pointer" onClick={() => setTelaAtiva("compras")}>
          <div className="flex justify-between items-start"><div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl"><Package className="w-5 h-5"/></div></div>
          <h3 className="text-3xl font-bold text-slate-900 mt-4">{comprasFiltradas.filter(c => !["Comprado", "Entregue total", "Cancelado", "Reprovado"].includes(c.status)).length}</h3>
          <p className="text-sm font-medium text-slate-500">Compras Abertas</p>
        </Card>
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        <Card id="aprovacoes_widget" className="xl:col-span-2 flex flex-col border-purple-200 shadow-md shadow-purple-100/50">
          <div className="p-6 border-b border-purple-100 bg-purple-50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-purple-900 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-purple-600" /> Requer Análise do Gestor
            </h2>
          </div>
          <div className="p-0 flex-1 overflow-y-auto">
            {aprovaçõesPendentes.length === 0 ? (
              <div className="text-center text-slate-500 py-10">Nenhuma pendência de análise no momento.</div>
            ) : (
              <table className="w-full text-left">
                <tbody className="divide-y divide-slate-100">
                  {aprovaçõesPendentes.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${item.tipoAprovacao === 'pagamento' ? 'bg-emerald-100 text-emerald-600' : item.tipoAprovacao === 'compra' ? 'bg-indigo-100 text-indigo-600' : 'bg-blue-100 text-blue-600'}`}>
                            {item.tipoAprovacao === 'pagamento' ? <DollarSign className="w-4 h-4"/> : item.tipoAprovacao === 'compra' ? <Package className="w-4 h-4"/> : <FolderKanban className="w-4 h-4"/>}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{item.favorecido || item.item || item.titulo}</p>
                            <p className="text-xs text-slate-500">{item.obra} • {item.tipoAprovacao.toUpperCase()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right font-semibold text-slate-900">
                        {item.tipoAprovacao === 'pagamento' && (item.valor ? formatBRL(item.valor) : '-')}
                        {item.tipoAprovacao === 'compra' && (
                          <div className="flex flex-col items-end">
                            <span>{item.quantidade} {item.unidade || ''}</span>
                            {item.valorEstimado && <span className="text-xs text-slate-500 font-normal mt-0.5">Est: {formatBRL(item.valorEstimado)}</span>}
                          </div>
                        )}
                        {item.tipoAprovacao === 'demanda' && '-'}
                      </td>
                      <td className="p-4 text-right">
                        <Button variant="primary" icon={FileCheck} onClick={() => abrirModalAvaliacao(item, item.tipoAprovacao)} className="py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 shadow-md">Analisar</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        <Card className="flex flex-col">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
             <h2 className="text-lg font-bold text-slate-900">Suas Obras</h2>
             <Button variant="ghost" onClick={() => setTelaAtiva("obras")} className="text-xs px-2 py-1">Ver Todas</Button>
          </div>
          <div className="p-4 space-y-3">
             {obrasFiltradas.slice(0,4).map(obra => (
                <div key={obra.id} className="p-3 border border-slate-100 rounded-xl bg-slate-50 flex justify-between items-center">
                   <div><p className="font-bold text-sm text-slate-900">{obra.nome}</p><p className="text-xs text-slate-500">{obra.cidade}</p></div>
                   <Badge value={obra.status} />
                </div>
             ))}
          </div>
        </Card>
      </div>
    </div>
  );

  const renderObras = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold text-slate-900">Obras</h1><p className="text-slate-500 mt-1">Gerencie os canteiros ativos.</p></div>
        <Button icon={Plus} onClick={() => abrirModal('obra')}>Nova Obra</Button>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {obrasFiltradas.map(obra => (
          <Card key={obra.id} className="flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-start bg-slate-50">
              <div><h3 className="text-lg font-bold text-slate-900">{obra.nome}</h3><p className="text-sm text-slate-500 mt-1">{obra.cidade}</p></div>
              <Badge value={obra.status} />
            </div>
            <div className="p-5 flex-1 space-y-4 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Cliente:</span><span className="font-medium">{obra.cliente}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Engenheiro:</span><span className="font-medium">{obra.responsavel}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Prazo:</span><span className="font-medium">{formatDate(obra.prazo)}</span></div>
            </div>
            <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
               <Button variant="outline" icon={Edit} onClick={() => abrirModal('obra', obra)} className="py-1.5 px-3 text-xs">Editar</Button>
               <Button variant="danger" icon={Trash2} onClick={() => solicitarExclusao(obra.id, 'obra')} className="py-1.5 px-3 text-xs">Excluir</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderDemandas = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold text-slate-900">Demandas</h1><p className="text-slate-500 mt-1">Tarefas operacionais e pendências.</p></div>
        <Button icon={Plus} onClick={() => abrirModal('demanda')}>Nova Demanda</Button>
      </div>
      <div className="space-y-4">
        {demandasFiltradas.map(demanda => (
          <Card key={demanda.id} className="p-5 flex flex-col md:flex-row justify-between md:items-start gap-4 hover:shadow-md transition-shadow">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-slate-900">{demanda.titulo}</h3>
                <Badge value={demanda.prioridade} /> <Badge value={demanda.status} />
              </div>
              <p className="text-sm text-slate-600">Obra: {demanda.obra} • Resp: {demanda.responsavel} • Setor: {demanda.setor} • Prazo: {formatDate(demanda.prazo)}</p>
              
              {demanda.status === 'Reprovado' && demanda.justificativa && (
                 <div className="mt-2 flex items-start gap-2 text-sm text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <p><strong>Motivo da Reprovação:</strong> {demanda.justificativa}</p>
                 </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
               {demanda.status === "Aguardando aprovação" && <Button variant="primary" icon={FileCheck} onClick={() => abrirModalAvaliacao(demanda, 'demanda')} className="text-xs">Analisar</Button>}
               {demanda.status !== "Concluído" && demanda.status !== "Reprovado" && <Button variant="outline" icon={CheckCircle2} onClick={() => concluirDemanda(demanda.id)} className="text-xs">Concluir</Button>}
               <Button variant="outline" icon={Edit} onClick={() => abrirModal('demanda', demanda)} className="text-xs p-2"><span className="sr-only">Editar</span></Button>
               <Button variant="danger" icon={Trash2} onClick={() => solicitarExclusao(demanda.id, 'demanda')} className="text-xs p-2"><span className="sr-only">Excluir</span></Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderComprasEPagamentos = (tipo) => {
    const isCompra = tipo === "compras";
    const data = isCompra ? comprasFiltradas : pagamentosFiltrados;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div><h1 className="text-2xl font-bold text-slate-900">{isCompra ? "Compras" : "Pagamentos"}</h1></div>
          <Button icon={Plus} onClick={() => abrirModal(tipo === 'compras' ? 'compra' : 'pagamento')}>
            {isCompra ? "Nova Compra" : "Novo Pagamento"}
          </Button>
        </div>

        <Card className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">{isCompra ? "Item/Insumo" : "Favorecido"}</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Obra</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">{isCompra ? "Quantidade" : "Valor"}</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                     <p className="text-sm font-bold text-slate-900">{isCompra ? item.item : item.favorecido}</p>
                     {item.status === 'Reprovado' && item.justificativa && (
                       <p className="text-xs text-red-600 mt-1 truncate max-w-[200px]" title={item.justificativa}>Motivo: {item.justificativa}</p>
                     )}
                     {(item.status === 'Programado' || item.status === 'Aguardando pagamento') && (item.vencimento || item.dataProgramada) && (
                       <p className="text-xs text-emerald-600 mt-1 font-medium">Programado p/ {formatDate(item.vencimento || item.dataProgramada)}</p>
                     )}
                  </td>
                  <td className="p-4 text-sm text-slate-600">{item.obra}</td>
                  <td className="p-4 text-sm font-semibold">
                    {isCompra ? (
                      <div>
                        {item.quantidade} {item.unidade}
                        {item.valorEstimado && <div className="text-xs text-slate-500 font-normal mt-0.5">Est: {formatBRL(item.valorEstimado)}</div>}
                      </div>
                    ) : formatBRL(item.valor)}
                  </td>
                  <td className="p-4"><Badge value={item.status} /></td>
                  <td className="p-4 flex justify-end gap-2">
                    {item.status === "Aguardando aprovação" && (
                       <Button variant="primary" icon={FileCheck} onClick={() => abrirModalAvaliacao(item, isCompra ? 'compra' : 'pagamento')} className="text-xs py-1.5 px-3">Analisar</Button>
                    )}
                    {!isCompra && item.status === "Programado" && (
                       <Button variant="outline" icon={DollarSign} onClick={() => marcarComoPago(item.id)} className="text-emerald-700 border-emerald-200 text-xs py-1.5 px-3 hover:bg-emerald-50">Dar Baixa</Button>
                    )}
                    <Button variant="ghost" onClick={() => abrirModal(isCompra ? 'compra' : 'pagamento', item)} className="p-2"><Edit className="w-4 h-4"/></Button>
                    <Button variant="danger" onClick={() => solicitarExclusao(item.id, isCompra ? 'compra' : 'pagamento')} className="p-2"><Trash2 className="w-4 h-4"/></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    );
  };

  const renderMedicoes = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold text-slate-900">Medições</h1><p className="text-slate-500 mt-1">Acompanhamento de medições e faturamentos.</p></div>
        <Button icon={Plus} onClick={() => abrirModal('medicao')}>Nova Medição</Button>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Obra & Data</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Valores (Previsto / Aprov)</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Status Fiscal & NF</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Recebimento</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {medicoesFiltradas.map(item => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4">
                   <p className="text-sm font-bold text-slate-900">{item.obra || "-"}</p>
                   <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><Clock3 className="w-3 h-3"/> {formatDate(item.dataMedicao)}</p>
                </td>
                <td className="p-4">
                   <p className="text-sm text-slate-600">Previsto: <span className="font-medium text-slate-900">{formatBRL(item.valorPrevisto)}</span></p>
                   <p className="text-sm text-slate-600 mt-1">Aprovado: <span className="font-medium text-emerald-600">{formatBRL(item.valorAprovado)}</span></p>
                </td>
                <td className="p-4">
                   <div className="flex flex-col gap-2 items-start">
                     <Badge value={item.statusFiscal === "Aprovado" ? "Concluído" : item.statusFiscal === "Reprovado" ? "Reprovado" : "Pendente"} />
                     <span className={`text-xs font-semibold px-2 py-1 rounded-md ${item.nfEmitida === 'Sim' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>NF: {item.nfEmitida}</span>
                   </div>
                </td>
                <td className="p-4">
                   <p className="text-sm font-bold text-slate-900">{formatBRL(item.valorPago)}</p>
                   <p className="text-xs text-slate-500 mt-1">{item.bancoPago || "Banco não inf."} • {formatDate(item.dataRecebimento)}</p>
                </td>
                <td className="p-4 flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => abrirModal('medicao', item)} className="p-2"><Edit className="w-4 h-4"/></Button>
                  <Button variant="danger" onClick={() => solicitarExclusao(item.id, 'medicao')} className="p-2"><Trash2 className="w-4 h-4"/></Button>
                </td>
              </tr>
            ))}
            {medicoesFiltradas.length === 0 && (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-500">Nenhuma medição encontrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );

  const renderLixeira = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><ShieldAlert className="w-6 h-6 text-red-600" /> Exclusões (Gestor)</h1>
           <p className="text-slate-500 mt-1">Usuários solicitaram a exclusão destes itens. Aprove ou restaure.</p>
        </div>
      </div>
      
      {exclusoesPendentes.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-10 bg-white rounded-3xl border border-slate-200 shadow-sm text-slate-500">
          <CheckCircle2 className="w-10 h-10 mb-2 text-emerald-400" />
          Nenhum item aguardando exclusão.
        </div>
      ) : (
        <Card className="overflow-x-auto border-red-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-red-50/50 border-b border-red-100">
                <th className="p-4 text-xs font-semibold text-slate-600 uppercase">Tipo</th>
                <th className="p-4 text-xs font-semibold text-slate-600 uppercase">Item/Título</th>
                <th className="p-4 text-xs font-semibold text-slate-600 uppercase">Obra</th>
                <th className="p-4 text-xs font-semibold text-slate-600 uppercase text-right">Ação do Gestor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {exclusoesPendentes.map(item => (
                <tr key={`${item.tipoLogico}-${item.id}`} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                     <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                       <item.icone className="w-3.5 h-3.5" /> {item.tipoLogico}
                     </span>
                  </td>
                  <td className="p-4 text-sm font-bold text-slate-900">{item.tituloExibicao}</td>
                  <td className="p-4 text-sm text-slate-600">{item.obra || '-'}</td>
                  <td className="p-4 flex justify-end gap-2">
                    <Button variant="outline" icon={RefreshCcw} onClick={() => restaurarItem(item.id, item.tipoLogico)} className="text-xs py-1.5 px-3">Restaurar</Button>
                    <Button variant="danger" icon={Trash2} onClick={() => solicitarExclusaoDefinitiva(item.id, item.tipoLogico)} className="text-xs py-1.5 px-3 bg-red-600 text-white hover:bg-red-700 hover:text-white shadow-sm shadow-red-200">
                      Confirmar Exclusão
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );

  const renderConteudo = () => {
    switch (telaAtiva) {
      case "dashboard": return renderDashboard();
      case "obras": return renderObras();
      case "demandas": return renderDemandas();
      case "compras": return renderComprasEPagamentos("compras");
      case "pagamentos": return renderComprasEPagamentos("pagamentos");
      case "medicoes": return renderMedicoes();
      case "exclusoes": return renderLixeira();
      default: return renderDashboard();
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900">
      
      {/* SIDEBAR NO DESKTOP */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 transform transition-transform duration-300 lg:translate-x-0 lg:static flex flex-col ${menuMobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6 flex items-center justify-between text-white border-b border-slate-800">
          <div className="flex items-center gap-3"><Building2 className="w-6 h-6 text-indigo-400" /><span className="font-bold text-lg">ConstruFlow</span></div>
          <button className="lg:hidden" onClick={() => setMenuMobileOpen(false)}><X className="w-6 h-6" /></button>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {MENU_ITEMS.map((item) => (
            <button key={item.key} onClick={() => { setTelaAtiva(item.key); setMenuMobileOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${telaAtiva === item.key ? "bg-indigo-600 text-white" : "hover:bg-slate-800 hover:text-white"}`}>
              <item.icon className="w-5 h-5" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">{item.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="p-4 bg-slate-950/50 mt-auto border-t border-slate-800 flex flex-col gap-2">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-sm">US</div>
               <div className="text-sm">
                  <p className="font-bold text-white">Usuário Padrão</p>
                  <p className="text-xs text-slate-400">Pode criar/editar</p>
               </div>
             </div>
        </div>
      </aside>

      {menuMobileOpen && <div className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden" onClick={() => setMenuMobileOpen(false)} />}

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* TOPBAR */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 relative z-20 shadow-sm">
          <div className="flex items-center gap-4 flex-1">
            <button className="lg:hidden p-2 text-slate-600" onClick={() => setMenuMobileOpen(true)}><Menu className="w-6 h-6" /></button>
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full w-full max-w-md focus-within:ring-2 ring-indigo-500/50">
              <Search className="w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Buscar em todas as telas..." className="bg-transparent border-none outline-none text-sm w-full" value={buscaGeral} onChange={e => setBuscaGeral(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select value={filtroObraGlobal} onChange={e => setFiltroObraGlobal(e.target.value)} className="text-sm border-none bg-slate-100 rounded-lg px-3 py-2 font-medium text-slate-700 cursor-pointer">
              <option value="Todas as Obras">Todas as Obras</option>
              {nomesObras.map(nome => <option key={nome} value={nome}>{nome}</option>)}
            </select>
          </div>
        </header>

        {/* CONTEÚDO */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto pb-12">
             {renderConteudo()}
          </div>
        </div>
      </main>

      {/* MODAL 1: AVALIAÇÃO DO GESTOR (Aprovar/Reprovar e Data) */}
      <Modal isOpen={modalAvaliacao.isOpen} onClose={() => setModalAvaliacao({isOpen: false, item: null, tipo: null})} title="Análise do Gestor">
        <div className="space-y-5">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
             <div>
                 <p className="font-bold text-slate-900 text-lg">{modalAvaliacao.item?.titulo || modalAvaliacao.item?.item || modalAvaliacao.item?.favorecido}</p>
                 <p className="text-sm text-slate-500">{modalAvaliacao.item?.obra} • {(modalAvaliacao.tipo || "").toUpperCase()}</p>
             </div>
             <div className="sm:text-right">
                  <p className="font-bold text-indigo-700 text-xl">
                    {modalAvaliacao.tipo === 'pagamento' && formatBRL(modalAvaliacao.item?.valor)}
                    {modalAvaliacao.tipo === 'compra' && (
                       <span className="flex flex-col items-end">
                           <span>{modalAvaliacao.item?.quantidade} {modalAvaliacao.item?.unidade}</span>
                           {modalAvaliacao.item?.valorEstimado && <span className="text-sm text-slate-500 font-medium mt-1">Estimado: {formatBRL(modalAvaliacao.item.valorEstimado)}</span>}
                       </span>
                    )}
                    {modalAvaliacao.tipo === 'demanda' && '-'}
                  </p>
             </div>
          </div>

          <div className="flex gap-4">
              <button
                  onClick={() => setAvalForm({...avalForm, decisao: 'aprovar'})}
                  className={`flex-1 p-4 border-2 rounded-xl flex flex-col items-center justify-center gap-2 transition-all ${avalForm.decisao === 'aprovar' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-200 text-slate-500 hover:border-emerald-200 hover:bg-emerald-50/30'}`}
              >
                  <ThumbsUp className="w-6 h-6" />
                  <span className="font-bold">Aprovar</span>
              </button>
              <button
                  onClick={() => setAvalForm({...avalForm, decisao: 'reprovar'})}
                  className={`flex-1 p-4 border-2 rounded-xl flex flex-col items-center justify-center gap-2 transition-all ${avalForm.decisao === 'reprovar' ? 'bg-red-50 border-red-500 text-red-700' : 'border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50/30'}`}
              >
                  <ThumbsDown className="w-6 h-6" />
                  <span className="font-bold">Reprovar</span>
              </button>
          </div>

          {avalForm.decisao === 'aprovar' && (modalAvaliacao.tipo === 'pagamento' || modalAvaliacao.tipo === 'compra') && (
              <div className="animate-in fade-in slide-in-from-top-2">
                  <Input type="date" label="Data de Programação do Pagamento" value={avalForm.data} onChange={e => setAvalForm({...avalForm, data: e.target.value})} />
              </div>
          )}

          {avalForm.decisao === 'reprovar' && (
              <div className="animate-in fade-in slide-in-from-top-2 flex flex-col gap-1.5 w-full">
                  <label className="text-sm font-medium text-slate-700">Justificativa da Reprovação <span className="text-red-500">*</span></label>
                  <textarea 
                    className="w-full px-3 py-2 bg-slate-50/50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" 
                    rows="3" 
                    placeholder="Explique o motivo da não aprovação para o solicitante..." 
                    value={avalForm.justificativa} 
                    onChange={e => setAvalForm({...avalForm, justificativa: e.target.value})}
                  />
              </div>
          )}

          <div className="pt-4 border-t border-slate-100">
              <Input 
                type="password" 
                label="Senha de Acesso (Gestor)" 
                placeholder="Digite sua senha para assinar..." 
                value={avalForm.senha} 
                onChange={e => {setAvalForm({...avalForm, senha: e.target.value}); setErroSenha("");}} 
              />
              {erroSenha && <p className="text-sm text-red-600 font-medium mt-1">{erroSenha}</p>}
          </div>

          <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setModalAvaliacao({isOpen: false, item: null, tipo: null})}>Cancelar</Button>
              <Button onClick={confirmarAvaliacao} icon={CheckCircle2}>Confirmar Decisão</Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: SENHA DO GESTOR (Apenas para exclusão definitiva na lixeira) */}
      <Modal isOpen={modalSenha.isOpen} onClose={() => setModalSenha({isOpen: false, id: null, tipo: null})} title="Confirmar Exclusão">
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-amber-800">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">Esta ação apagará o item permanentemente do sistema e requer privilégios de Gestor.</p>
          </div>
          <Input 
            type="password" 
            label="Senha de Acesso (Gestor)" 
            placeholder="Digite a senha..." 
            value={senhaInput} 
            onChange={e => {setSenhaInput(e.target.value); setErroSenha("");}} 
          />
          {erroSenha && <p className="text-sm text-red-600 font-medium">{erroSenha}</p>}
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setModalSenha({isOpen: false, id: null, tipo: null})}>Cancelar</Button>
            <Button variant="danger" onClick={confirmarExclusaoDefinitiva} icon={Trash2} className="bg-red-600 text-white hover:bg-red-700">Excluir Definitivamente</Button>
          </div>
        </div>
      </Modal>

      {/* NOVO MODAL: CONFIRMAÇÃO DE ENVIO PARA LIXEIRA (Substitui window.confirm) */}
      <Modal isOpen={modalConfirmarExclusao.isOpen} onClose={() => setModalConfirmarExclusao({isOpen: false, id: null, tipo: null})} title="Enviar para a Lixeira">
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-amber-800">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">Deseja enviar este item para a lixeira? A exclusão definitiva dependerá da aprovação de um Gestor.</p>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setModalConfirmarExclusao({isOpen: false, id: null, tipo: null})}>Cancelar</Button>
            <Button variant="danger" onClick={confirmarEnvioLixeira} icon={Trash2} className="bg-red-600 text-white hover:bg-red-700 hover:text-white">Sim, enviar para lixeira</Button>
          </div>
        </div>
      </Modal>

      {/* MODAIS COMUNS (CRIAR/EDITAR) */}
      <Modal isOpen={modalAtivo === 'obra'} onClose={fecharModal} title={itemEditando ? "Editar Obra" : "Nova Obra"}><FormObra /></Modal>
      <Modal isOpen={modalAtivo === 'demanda'} onClose={fecharModal} title={itemEditando ? "Editar Demanda" : "Nova Demanda"}><FormDemanda /></Modal>
      <Modal isOpen={modalAtivo === 'compra'} onClose={fecharModal} title={itemEditando ? "Editar Compra" : "Nova Compra"}><FormCompra /></Modal>
      <Modal isOpen={modalAtivo === 'pagamento'} onClose={fecharModal} title={itemEditando ? "Editar Pagamento" : "Novo Pagamento"}><FormPagamento /></Modal>
      <Modal isOpen={modalAtivo === 'medicao'} onClose={fecharModal} title={itemEditando ? "Editar Medição" : "Nova Medição"}><FormMedicao /></Modal>
    </div>
  );
}
