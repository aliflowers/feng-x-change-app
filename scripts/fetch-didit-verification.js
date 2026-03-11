const DIDIT_API_KEY = process.env.DIDIT_API_KEY;

let DIDIT_API_URL = process.env.DIDIT_API_URL || 'https://verification.didit.me/v3';
if (DIDIT_API_URL.includes('apx.didit.me') || DIDIT_API_URL.includes('api.didit.me')) {
  DIDIT_API_URL = 'https://verification.didit.me/v3';
}

function readArg(name) {
  const prefix = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  if (!found) return null;
  return found.slice(prefix.length);
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function usage(exitCode) {
  const msg = [
    'Uso:',
    '  node scripts/fetch-didit-verification.js --session_id=<uuid> [--vendor_data=<uuid>] [--workflow_id=<uuid>]',
    '  node scripts/fetch-didit-verification.js --session_id=<uuid> --summary',
    '',
    'Variables de entorno requeridas:',
    '  DIDIT_API_KEY',
    '',
    'Opcionales:',
    '  DIDIT_API_URL (default: https://verification.didit.me/v3)',
    '',
    'Ejemplo (Node 20+):',
    '  node --env-file apps/web/.env.local scripts/fetch-didit-verification.js --session_id=e1a58fe1-e6a4-4151-bac2-e9582616b901 --vendor_data=b62400b7-d2ae-4bff-8817-867fad826c23 --workflow_id=72b8f776-6c3b-4c07-8d3d-b75d081cd10c',
  ].join('\n');
  if (exitCode === 0) console.log(msg);
  else console.error(msg);
  process.exit(exitCode);
}

function joinUrl(base, path) {
  const b = base.endsWith('/') ? base.slice(0, -1) : base;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${b}${p}`;
}

async function fetchJson(url) {
  const resp = await fetch(url, {
    method: 'GET',
    headers: {
      'x-api-key': DIDIT_API_KEY,
      'Content-Type': 'application/json',
    },
  });

  const contentType = resp.headers.get('content-type') || '';
  const text = await resp.text();

  let json = null;
  if (contentType.includes('application/json')) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  } else {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  return {
    ok: resp.ok,
    status: resp.status,
    url,
    json,
    text: json ? null : text,
  };
}

function pick(obj, paths) {
  for (const p of paths) {
    const parts = p.split('.');
    let cur = obj;
    let ok = true;
    for (const part of parts) {
      if (!cur || typeof cur !== 'object' || !(part in cur)) {
        ok = false;
        break;
      }
      cur = cur[part];
    }
    if (ok) return cur;
  }
  return null;
}

async function main() {
  if (hasFlag('--help') || hasFlag('-h')) usage(0);

  const sessionId = readArg('session_id');
  const expectedVendorData = readArg('vendor_data');
  const expectedWorkflowId = readArg('workflow_id');
  const pretty = !hasFlag('--compact');
  const summary = hasFlag('--summary');

  if (!sessionId) usage(1);
  if (!DIDIT_API_KEY) {
    console.error('Falta DIDIT_API_KEY en variables de entorno.');
    process.exit(1);
  }

  const candidates = [
    joinUrl(DIDIT_API_URL, `sessions/${sessionId}`),
    joinUrl(DIDIT_API_URL, `session/${sessionId}`),
    joinUrl(DIDIT_API_URL, `session/${sessionId}/decision`),
    joinUrl(DIDIT_API_URL, `sessions?session_id=${encodeURIComponent(sessionId)}`),
  ];

  const responses = [];
  for (const url of candidates) {
    try {
      responses.push(await fetchJson(url));
    } catch (e) {
      responses.push({
        ok: false,
        status: 0,
        url,
        json: null,
        text: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const best = responses.find((r) => r.ok && r.json) || null;
  const bestJson = best?.json || null;

  const actualStatus = bestJson ? pick(bestJson, ['status']) : null;
  const actualWorkflowId = bestJson ? pick(bestJson, ['workflow_id', 'workflowId']) : null;
  const actualVendorData = bestJson
    ? pick(bestJson, ['vendor_data', 'vendorData', 'vendor', 'metadata.vendor_data', 'metadata.vendorData'])
    : null;

  const checks = {
    has_success_response: Boolean(best),
    status: { expected: null, actual: actualStatus, match: null },
    workflow_id: expectedWorkflowId
      ? { expected: expectedWorkflowId, actual: actualWorkflowId, match: expectedWorkflowId === actualWorkflowId }
      : { expected: null, actual: actualWorkflowId, match: null },
    vendor_data: expectedVendorData
      ? { expected: expectedVendorData, actual: actualVendorData, match: expectedVendorData === actualVendorData }
      : { expected: null, actual: actualVendorData, match: null },
  };

  const out = {
    requested: {
      session_id: sessionId,
      expected_vendor_data: expectedVendorData,
      expected_workflow_id: expectedWorkflowId,
      didit_api_url: DIDIT_API_URL,
    },
    checks,
    extracted: {
      status: actualStatus,
      workflow_id: actualWorkflowId,
      vendor_data: actualVendorData,
    },
    best_response: best
      ? { ok: best.ok, status: best.status, url: best.url }
      : null,
    responses: summary ? undefined : responses,
  };

  console.log(pretty ? JSON.stringify(out, null, 2) : JSON.stringify(out));
}

main().catch((e) => {
  console.error('Error ejecutando script:', e);
  process.exit(1);
});
