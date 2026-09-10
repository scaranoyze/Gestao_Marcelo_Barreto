const STORAGE_KEY = "controle_financeiro_marcelo_v1";

let clientes = carregarDados();

if (!clientes.length) {
  clientes = [{
    id: crypto.randomUUID(),
    nome: "UILTNAI SANTOS DE SOUZA",
    cpf: "068.252.315-10",
    contato: "73 999784592",
    valorTotal: 27074.88,
    observacoes: "",
    parcelas: gerarParcelas(12, 2256.24, "2026-04-25", 4)
  }];
  salvarDados();
}

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function moeda(v) {
  return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataBR(data) {
  if (!data) return "-";
  const [a,m,d] = data.split("-");
  return `${d}/${m}/${a}`;
}

function hojeISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

function adicionarMes(dataISO, qtd) {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const d = new Date(ano, mes - 1 + qtd, 1);
  const ultimoDia = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(dia, ultimoDia));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function gerarParcelas(qtd, valor, primeiroVencimento, pagas = 0) {
  return Array.from({ length: Number(qtd) }, (_, i) => ({
    id: crypto.randomUUID(),
    numero: i + 1,
    valor: Number(valor),
    vencimento: adicionarMes(primeiroVencimento, i),
    pago: i < Number(pagas),
    dataPagamento: i < Number(pagas) ? adicionarMes(primeiroVencimento, i) : null
  }));
}

function statusParcela(p) {
  if (p.pago) return "pago";
  return p.vencimento < hojeISO() ? "atrasado" : "pendente";
}

function resumoCliente(c) {
  const total = c.parcelas.reduce((s,p) => s + Number(p.valor), 0);
  const recebido = c.parcelas.filter(p => p.pago).reduce((s,p) => s + Number(p.valor), 0);
  const atrasado = c.parcelas.filter(p => statusParcela(p) === "atrasado").reduce((s,p) => s + Number(p.valor), 0);
  return {
    total,
    recebido,
    aberto: total - recebido,
    atrasado,
    pagas: c.parcelas.filter(p => p.pago).length
  };
}


function chaveMes(dataISO) {
  return dataISO ? dataISO.slice(0, 7) : "";
}

function mesAnteriorChave(chave) {
  const [ano, mes] = chave.split("-").map(Number);
  const d = new Date(ano, mes - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nomeMes(numero, curto = false) {
  const meses = curto
    ? ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
    : ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  return meses[numero - 1];
}

function dadosFaturamento() {
  const realizado = {};
  const previsto = {};

  clientes.forEach(c => {
    c.parcelas.forEach(p => {
      const valor = Number(p.valor || 0);

      if (p.pago && p.dataPagamento) {
        const mes = chaveMes(p.dataPagamento);
        realizado[mes] = (realizado[mes] || 0) + valor;
      }

      if (p.vencimento) {
        const mes = chaveMes(p.vencimento);
        previsto[mes] = (previsto[mes] || 0) + valor;
      }
    });
  });

  return { realizado, previsto };
}

function anosDisponiveisFaturamento() {
  const anos = new Set([new Date().getFullYear()]);
  clientes.forEach(c => c.parcelas.forEach(p => {
    if (p.vencimento) anos.add(Number(p.vencimento.slice(0,4)));
    if (p.dataPagamento) anos.add(Number(p.dataPagamento.slice(0,4)));
  }));
  return [...anos].sort((a,b) => b-a);
}

function garantirFiltroAnos() {
  const select = $("#filtroAnoFaturamento");
  if (!select) return;
  const atual = select.value;
  const anos = anosDisponiveisFaturamento();
  select.innerHTML = anos.map(a => `<option value="${a}">${a}</option>`).join("");
  select.value = anos.includes(Number(atual)) ? atual : String(new Date().getFullYear());
}

function atualizarCardsFaturamentoDashboard() {
  const { realizado, previsto } = dadosFaturamento();
  const mesAtual = chaveMes(hojeISO());
  const anterior = mesAnteriorChave(mesAtual);
  const mesesComReceita = Object.values(realizado);
  const media = mesesComReceita.length
    ? mesesComReceita.reduce((s,v) => s + v, 0) / mesesComReceita.length
    : 0;

  $("#dashMesAtual").textContent = moeda(realizado[mesAtual] || 0);
  $("#dashPrevistoMes").textContent = moeda(previsto[mesAtual] || 0);
  $("#dashMesAnterior").textContent = moeda(realizado[anterior] || 0);
  $("#dashMediaMensal").textContent = moeda(media);
}

function renderFaturamento() {
  const { realizado, previsto } = dadosFaturamento();
  garantirFiltroAnos();

  const mesAtual = chaveMes(hojeISO());
  const anterior = mesAnteriorChave(mesAtual);
  const atualValor = realizado[mesAtual] || 0;
  const anteriorValor = realizado[anterior] || 0;
  const totalHistorico = Object.values(realizado).reduce((s,v) => s + v, 0);

  $("#fatMesAtual").textContent = moeda(atualValor);
  $("#fatMesAnterior").textContent = moeda(anteriorValor);
  $("#fatPrevistoAtual").textContent = moeda(previsto[mesAtual] || 0);
  $("#fatTotalHistorico").textContent = moeda(totalHistorico);

  const [anoAtual, numMesAtual] = mesAtual.split("-").map(Number);
  $("#fatMesAtualLabel").textContent = `${nomeMes(numMesAtual)} de ${anoAtual}`;

  const variacao = $("#fatVariacao");
  if (anteriorValor > 0) {
    const pct = ((atualValor - anteriorValor) / anteriorValor) * 100;
    variacao.textContent = `${pct >= 0 ? "+" : ""}${pct.toFixed(1).replace(".", ",")}% em relação ao mês anterior`;
    variacao.className = `card-note ${pct >= 0 ? "positive" : "negative"}`;
  } else {
    variacao.textContent = "Sem base no mês anterior";
    variacao.className = "card-note";
  }

  const ano = Number($("#filtroAnoFaturamento").value || new Date().getFullYear());
  const meses = Array.from({length:12}, (_,i) => {
    const chave = `${ano}-${String(i+1).padStart(2,"0")}`;
    return {
      numero:i+1,
      nome:nomeMes(i+1, true),
      realizado:realizado[chave] || 0,
      previsto:previsto[chave] || 0
    };
  });

  const max = Math.max(1, ...meses.flatMap(m => [m.realizado, m.previsto]));

  $("#graficoFaturamento").innerHTML = `
    <div class="chart-legend">
      <span class="legend-item"><i class="legend-dot realizado"></i> Realizado</span>
      <span class="legend-item"><i class="legend-dot previsto"></i> Previsto</span>
    </div>
    ${meses.map(m => `
      <div class="revenue-month">
        <div class="revenue-bars">
          <div class="revenue-bar realizado"
               title="Realizado: ${moeda(m.realizado)}"
               style="height:${Math.max(m.realizado ? 4 : 1, (m.realizado/max)*100)}%"></div>
          <div class="revenue-bar previsto"
               title="Previsto: ${moeda(m.previsto)}"
               style="height:${Math.max(m.previsto ? 4 : 1, (m.previsto/max)*100)}%"></div>
        </div>
        <div class="revenue-label">${m.nome}</div>
      </div>
    `).join("")}
  `;

  let acumulado = 0;
  $("#tabelaFaturamento").innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Mês</th>
          <th>Realizado</th>
          <th>Previsto</th>
          <th>Diferença</th>
          <th>Acumulado recebido</th>
        </tr>
      </thead>
      <tbody>
        ${meses.map(m => {
          acumulado += m.realizado;
          const diferenca = m.realizado - m.previsto;
          return `
            <tr>
              <td>${nomeMes(m.numero)} / ${ano}</td>
              <td>${moeda(m.realizado)}</td>
              <td>${moeda(m.previsto)}</td>
              <td class="${diferenca >= 0 ? "positive" : "negative"}">${moeda(diferenca)}</td>
              <td>${moeda(acumulado)}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

function carregarDados() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function salvarDados() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clientes));
  renderTudo();
}

function renderDashboard() {
  const geral = clientes.reduce((acc,c) => {
    const r = resumoCliente(c);
    acc.total += r.total;
    acc.recebido += r.recebido;
    acc.aberto += r.aberto;
    acc.atrasado += r.atrasado;
    return acc;
  }, {total:0, recebido:0, aberto:0, atrasado:0});

  $("#dashTotal").textContent = moeda(geral.total);
  $("#dashRecebido").textContent = moeda(geral.recebido);
  $("#dashAberto").textContent = moeda(geral.aberto);
  $("#dashAtrasado").textContent = moeda(geral.atrasado);

  const wrap = $("#listaResumo");
  if (!clientes.length) {
    wrap.innerHTML = `<div class="empty">Nenhum cliente cadastrado.</div>`;
    return;
  }

  wrap.innerHTML = clientes.map(c => {
    const r = resumoCliente(c);
    const perc = c.parcelas.length ? (r.pagas / c.parcelas.length) * 100 : 0;
    return `
      <article class="client-card">
        <h3>${esc(c.nome)}</h3>
        <div class="meta">${esc(c.contato || "Sem contato")}</div>

        <div class="money-row">
          <div class="money-box"><span>Total</span><strong>${moeda(r.total)}</strong></div>
          <div class="money-box"><span>Recebido</span><strong>${moeda(r.recebido)}</strong></div>
          <div class="money-box"><span>Em aberto</span><strong>${moeda(r.aberto)}</strong></div>
        </div>

        <div class="progress"><div style="width:${perc}%"></div></div>
        <div class="meta" style="margin-top:8px">${r.pagas}/${c.parcelas.length} parcelas pagas</div>

        <div class="card-actions">
          <button class="btn btn-primary btn-small" onclick="abrirDetalhes('${c.id}')">Ver ficha</button>
          <button class="btn btn-ghost btn-small" onclick="editarCliente('${c.id}')">Editar</button>
        </div>
      </article>
    `;
  }).join("");
}

function renderClientes() {
  const termo = ($("#buscaCliente").value || "").toLowerCase();
  const lista = clientes.filter(c =>
    c.nome.toLowerCase().includes(termo) ||
    (c.cpf || "").toLowerCase().includes(termo) ||
    (c.contato || "").toLowerCase().includes(termo)
  );

  $("#listaClientes").innerHTML = lista.length ? lista.map(c => {
    const r = resumoCliente(c);
    return `
      <div class="client-row">
        <div>
          <h3>${esc(c.nome)}</h3>
          <p>CPF: ${esc(c.cpf || "-")} • Contato: ${esc(c.contato || "-")}</p>
          <p>Total: ${moeda(r.total)} • Recebido: ${moeda(r.recebido)} • Em aberto: ${moeda(r.aberto)}</p>
        </div>
        <div class="client-actions">
          <button class="btn btn-primary btn-small" onclick="abrirDetalhes('${c.id}')">Ver ficha</button>
          <button class="btn btn-ghost btn-small" onclick="editarCliente('${c.id}')">Editar</button>
          <button class="btn btn-danger btn-small" onclick="excluirCliente('${c.id}')">Excluir</button>
        </div>
      </div>
    `;
  }).join("") : `<div class="empty">Nenhum cliente encontrado.</div>`;
}

function renderParcelas() {
  const filtro = $("#filtroParcelas").value;
  let linhas = [];

  clientes.forEach(c => {
    c.parcelas.forEach(p => {
      const status = statusParcela(p);
      if (filtro !== "todas" && filtro !== status) return;
      linhas.push({c,p,status});
    });
  });

  linhas.sort((a,b) => a.p.vencimento.localeCompare(b.p.vencimento));

  $("#listaParcelas").innerHTML = linhas.length ? `
    <table>
      <thead>
        <tr>
          <th>Cliente</th>
          <th>Parcela</th>
          <th>Vencimento</th>
          <th>Valor</th>
          <th>Status</th>
          <th>Pagamento</th>
          <th>Ação</th>
        </tr>
      </thead>
      <tbody>
        ${linhas.map(({c,p,status}) => `
          <tr>
            <td>${esc(c.nome)}</td>
            <td>${p.numero}ª</td>
            <td>${dataBR(p.vencimento)}</td>
            <td>${moeda(p.valor)}</td>
            <td><span class="badge ${status}">${labelStatus(status)}</span></td>
            <td>${p.dataPagamento ? dataBR(p.dataPagamento) : "-"}</td>
            <td>
              ${p.pago
                ? `<button class="btn btn-ghost btn-small" onclick="desfazerPagamento('${c.id}','${p.id}')">Desfazer baixa</button>`
                : `<button class="btn btn-success btn-small" onclick="darBaixa('${c.id}','${p.id}')">Dar baixa</button>`
              }
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  ` : `<div class="empty">Nenhuma parcela neste filtro.</div>`;
}

function labelStatus(s) {
  return s === "pago" ? "Pago" : s === "atrasado" ? "Atrasado" : "Pendente";
}

function abrirModal(id) {
  $("#" + id).classList.remove("hidden");
}

function fecharModal(id) {
  $("#" + id).classList.add("hidden");
}

function novoCliente() {
  $("#formCliente").reset();
  $("#clienteId").value = "";
  $("#parcelasPagas").value = "0";
  $("#qtdParcelas").value = "1";
  $("#clienteModalTitulo").textContent = "Novo cliente";
  abrirModal("modalCliente");
}

function editarCliente(id) {
  const c = clientes.find(x => x.id === id);
  if (!c) return;

  $("#clienteId").value = c.id;
  $("#nome").value = c.nome;
  $("#cpf").value = c.cpf || "";
  $("#contato").value = c.contato || "";
  $("#valorTotal").value = c.valorTotal || resumoCliente(c).total;
  $("#qtdParcelas").value = c.parcelas.length;
  $("#valorParcela").value = c.parcelas[0]?.valor || 0;
  $("#primeiroVencimento").value = c.parcelas[0]?.vencimento || hojeISO();
  $("#parcelasPagas").value = c.parcelas.filter(p => p.pago).length;
  $("#observacoes").value = c.observacoes || "";
  $("#clienteModalTitulo").textContent = "Editar cliente";
  abrirModal("modalCliente");
}

$("#formCliente").addEventListener("submit", (e) => {
  e.preventDefault();

  const id = $("#clienteId").value;
  const qtd = Number($("#qtdParcelas").value);
  const valorParcela = Number($("#valorParcela").value);
  const pagas = Math.min(Number($("#parcelasPagas").value || 0), qtd);

  const dados = {
    nome: $("#nome").value.trim(),
    cpf: $("#cpf").value.trim(),
    contato: $("#contato").value.trim(),
    valorTotal: Number($("#valorTotal").value),
    observacoes: $("#observacoes").value.trim(),
    parcelas: gerarParcelas(qtd, valorParcela, $("#primeiroVencimento").value, pagas)
  };

  if (id) {
    const idx = clientes.findIndex(c => c.id === id);
    dados.id = id;
    clientes[idx] = dados;
  } else {
    dados.id = crypto.randomUUID();
    clientes.push(dados);
  }

  salvarDados();
  fecharModal("modalCliente");
});

function excluirCliente(id) {
  const c = clientes.find(x => x.id === id);
  if (!c) return;
  if (!confirm(`Excluir o cliente "${c.nome}" e todas as parcelas?`)) return;
  clientes = clientes.filter(x => x.id !== id);
  salvarDados();
}

function darBaixa(clienteId, parcelaId) {
  const c = clientes.find(x => x.id === clienteId);
  const p = c?.parcelas.find(x => x.id === parcelaId);
  if (!p) return;

  const data = prompt("Data do pagamento (AAAA-MM-DD):", hojeISO());
  if (!data) return;

  p.pago = true;
  p.dataPagamento = data;
  salvarDados();

  if (!$("#modalDetalhes").classList.contains("hidden")) abrirDetalhes(clienteId);
}

function desfazerPagamento(clienteId, parcelaId) {
  const c = clientes.find(x => x.id === clienteId);
  const p = c?.parcelas.find(x => x.id === parcelaId);
  if (!p) return;
  if (!confirm("Deseja desfazer a baixa desta parcela?")) return;

  p.pago = false;
  p.dataPagamento = null;
  salvarDados();

  if (!$("#modalDetalhes").classList.contains("hidden")) abrirDetalhes(clienteId);
}

function editarParcela(clienteId, parcelaId) {
  const c = clientes.find(x => x.id === clienteId);
  const p = c?.parcelas.find(x => x.id === parcelaId);
  if (!p) return;

  const valor = prompt("Novo valor da parcela:", p.valor);
  if (valor === null) return;

  const vencimento = prompt("Novo vencimento (AAAA-MM-DD):", p.vencimento);
  if (!vencimento) return;

  p.valor = Number(String(valor).replace(",", "."));
  p.vencimento = vencimento;
  salvarDados();
  abrirDetalhes(clienteId);
}

function abrirDetalhes(id) {
  const c = clientes.find(x => x.id === id);
  if (!c) return;
  const r = resumoCliente(c);

  $("#detalheNome").textContent = c.nome;
  $("#detalheInfo").textContent = `CPF: ${c.cpf || "-"} • Contato: ${c.contato || "-"}`;

  $("#detalheConteudo").innerHTML = `
    <div class="detail-stats">
      <div class="detail-stat"><span>Total</span><strong>${moeda(r.total)}</strong></div>
      <div class="detail-stat"><span>Recebido</span><strong>${moeda(r.recebido)}</strong></div>
      <div class="detail-stat"><span>Em aberto</span><strong>${moeda(r.aberto)}</strong></div>
      <div class="detail-stat"><span>Atrasado</span><strong>${moeda(r.atrasado)}</strong></div>
    </div>

    ${c.observacoes ? `<p style="color:var(--muted); margin-bottom:16px"><strong>Observações:</strong> ${esc(c.observacoes)}</p>` : ""}

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Parcela</th>
            <th>Vencimento</th>
            <th>Valor</th>
            <th>Status</th>
            <th>Data pagamento</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${c.parcelas.map(p => {
            const s = statusParcela(p);
            return `
              <tr>
                <td>${p.numero}ª</td>
                <td>${dataBR(p.vencimento)}</td>
                <td>${moeda(p.valor)}</td>
                <td><span class="badge ${s}">${labelStatus(s)}</span></td>
                <td>${p.dataPagamento ? dataBR(p.dataPagamento) : "-"}</td>
                <td>
                  <div class="client-actions">
                    ${p.pago
                      ? `<button class="btn btn-ghost btn-small" onclick="desfazerPagamento('${c.id}','${p.id}')">Desfazer baixa</button>`
                      : `<button class="btn btn-success btn-small" onclick="darBaixa('${c.id}','${p.id}')">Dar baixa</button>`
                    }
                    <button class="btn btn-ghost btn-small" onclick="editarParcela('${c.id}','${p.id}')">Editar parcela</button>
                  </div>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;

  abrirModal("modalDetalhes");
}

function esc(v) {
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function renderTudo() {
  renderDashboard();
  renderClientes();
  renderParcelas();
  atualizarCardsFaturamentoDashboard();
  renderFaturamento();
}

$("#btnNovoCliente").addEventListener("click", novoCliente);
$("#buscaCliente").addEventListener("input", renderClientes);
$("#filtroParcelas").addEventListener("change", renderParcelas);
$("#filtroAnoFaturamento").addEventListener("change", renderFaturamento);

$$("[data-close]").forEach(el => {
  el.addEventListener("click", () => fecharModal(el.dataset.close));
});

$$(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    $$(".nav-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const view = btn.dataset.view;
    $$(".view").forEach(v => v.classList.remove("active"));
    $("#view-" + view).classList.add("active");

    const titulos = {
      dashboard: "Dashboard",
      clientes: "Clientes",
      parcelas: "Parcelas",
      faturamento: "Faturamento"
    };
    $("#pageTitle").textContent = titulos[view];
  });
});

$("#qtdParcelas").addEventListener("input", calcularValorParcela);
$("#valorTotal").addEventListener("input", calcularValorParcela);

function calcularValorParcela() {
  const total = Number($("#valorTotal").value || 0);
  const qtd = Number($("#qtdParcelas").value || 0);
  if (total > 0 && qtd > 0 && document.activeElement.id !== "valorParcela") {
    $("#valorParcela").value = (total / qtd).toFixed(2);
  }
}

renderTudo();
