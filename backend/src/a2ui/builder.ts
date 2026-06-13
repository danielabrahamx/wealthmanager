/**
 * A2UI v0.9 surface builder.
 *
 * Produces declarative UI envelopes (Google A2UI spec, v0.9) that the
 * frontend renders via @copilotkit/a2ui-renderer. Three message kinds are
 * emitted per surface:
 *   - createSurface     → register the surface + catalog
 *   - updateDataModel   → seed the data model (bindings resolve against this)
 *   - updateComponents  → the component tree (root component id = "root")
 *
 * Component nodes are { component, id, ...props }. Children are referenced by
 * id (never inline). See the basic catalog in @a2ui/web_core for prop schemas.
 */
import type { Fund, UserTier } from '../../../shared/index.js';

export const A2UI_CATALOG_ID = 'https://a2ui.org/specification/v0_9/basic_catalog.json';
export const A2UI_SURFACE_ID = 'wealth-surface';

export interface A2uiMessage {
  version: 'v0.9';
  createSurface?: { surfaceId: string; catalogId: string; theme?: unknown; sendDataModel?: boolean };
  updateComponents?: { surfaceId: string; components: ComponentNode[] };
  updateDataModel?: { surfaceId: string; path?: string; value?: unknown };
  deleteSurface?: { surfaceId: string };
}

export interface ComponentNode {
  component: string;
  id: string;
  [prop: string]: unknown;
}

/** A2UI button action - surfaces a named event back to the agent on click. */
function event(name: string, context: Record<string, unknown> = {}) {
  return { event: { name, context } };
}

/** Accumulates component nodes and hands out stable ids. The root is "root". */
class Surface {
  private nodes: ComponentNode[] = [];
  private counter = 0;

  add(component: string, props: Record<string, unknown> = {}, id?: string): string {
    const nodeId = id ?? `${component.toLowerCase()}-${++this.counter}`;
    this.nodes.push({ component, id: nodeId, ...props });
    return nodeId;
  }

  root(component: string, props: Record<string, unknown> = {}): string {
    return this.add(component, props, 'root');
  }

  components(): ComponentNode[] {
    return this.nodes;
  }
}

function envelope(surface: Surface, data: unknown = {}): A2uiMessage[] {
  return [
    { version: 'v0.9', createSurface: { surfaceId: A2UI_SURFACE_ID, catalogId: A2UI_CATALOG_ID } },
    { version: 'v0.9', updateDataModel: { surfaceId: A2UI_SURFACE_ID, path: '/', value: data } },
    { version: 'v0.9', updateComponents: { surfaceId: A2UI_SURFACE_ID, components: surface.components() } },
  ];
}

function riskLabel(level: Fund['riskLevel']): string {
  return level === 'low' ? 'Low risk' : level === 'high' ? 'High risk' : 'Medium risk';
}

function pct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

/**
 * Beginner - the initial set of tappable options (the "button they previously
 * had"). Each option dispatches a `set_profile` action carrying the chosen risk
 * appetite, which the agent turns into a recommendation on the next turn.
 */
export function buildBeginnerChoice(question: string): A2uiMessage[] {
  const s = new Surface();
  const children: string[] = [];

  children.push(s.add('Text', { text: question || 'How would you like to invest your money?', variant: 'h3' }));

  const option = (label: string, sub: string, choice: string, variant: string) =>
    s.add('Button', {
      child: s.add('Column', {
        children: [
          s.add('Text', { text: label, variant: 'h5' }),
          s.add('Text', { text: sub, variant: 'caption' }),
        ],
        align: 'start',
      }),
      variant,
      action: event('set_profile', { choice }),
    });

  children.push(option('Keep it safe', 'Slow, steady, low chance of loss', 'conservative', 'primary'));
  children.push(option('A balanced mix', 'Some growth with some protection', 'balanced', 'default'));
  children.push(option('Go for growth', 'Higher potential, bigger ups and downs', 'growth', 'default'));

  s.root('Column', { children, justify: 'start', align: 'stretch' });
  return envelope(s);
}

/** Beginner - a single, reassuring binary choice. */
export function buildSimpleChoice(recommendation: string, funds: Fund[]): A2uiMessage[] {
  const s = new Surface();
  const lead = funds[0];
  const children: string[] = [];

  children.push(s.add('Text', { text: 'Your recommendation', variant: 'h3' }));
  children.push(s.add('Text', { text: recommendation, variant: 'body' }));

  if (lead) {
    const inner = [
      s.add('Text', { text: lead.name, variant: 'h5' }),
      s.add('Text', { text: `${lead.ticker} · ${riskLabel(lead.riskLevel)} · ${pct(lead.projectedReturn)} projected`, variant: 'caption' }),
    ];
    children.push(s.add('Card', { child: s.add('Column', { children: inner, align: 'start' }) }));
  }

  const yes = s.add('Button', {
    child: s.add('Text', { text: '✓ Yes, invest this for me' }),
    variant: 'primary',
    action: event('invest', { fundIds: funds.map((f) => f.id) }),
  });
  const more = s.add('Button', {
    child: s.add('Text', { text: 'Tell me more first' }),
    variant: 'borderless',
    action: event('explain'),
  });
  children.push(yes, more);

  s.root('Column', { children, justify: 'start', align: 'stretch' });
  return envelope(s);
}

/** Intermediate - a grid/list of recommended funds, each selectable. */
export function buildFundGrid(funds: Fund[]): A2uiMessage[] {
  const s = new Surface();
  const children: string[] = [];

  children.push(s.add('Text', { text: '📊 Recommended funds', variant: 'h3' }));
  children.push(s.add('Text', { text: `${funds.length} funds matched to your profile. Pick one to invest.`, variant: 'caption' }));

  for (const f of funds) {
    const header = s.add('Row', {
      children: [
        s.add('Column', {
          children: [
            s.add('Text', { text: f.name, variant: 'h5' }),
            s.add('Text', { text: `${f.ticker} · ${f.category}`, variant: 'caption' }),
          ],
          align: 'start',
        }),
        s.add('Text', { text: pct(f.projectedReturn), variant: 'h5' }),
      ],
      justify: 'spaceBetween',
      align: 'center',
    });
    const select = s.add('Button', {
      child: s.add('Text', { text: `Select ${f.ticker}` }),
      variant: 'primary',
      action: event('invest', { fundIds: [f.id] }),
    });
    const card = s.add('Card', {
      child: s.add('Column', {
        children: [header, s.add('Text', { text: `${riskLabel(f.riskLevel)} · expense ${f.expenseRatio.toFixed(2)}%`, variant: 'caption' }), select],
        align: 'stretch',
      }),
    });
    children.push(card);
  }

  s.root('Column', { children, justify: 'start', align: 'stretch' });
  return envelope(s);
}

/** Sophisticated - full screener with metrics + analytics actions. */
export function buildAdvancedScreener(funds: Fund[], opts: { hasLiveData: boolean } = { hasLiveData: false }): A2uiMessage[] {
  const s = new Surface();
  const children: string[] = [];

  children.push(s.add('Text', { text: '🔍 Advanced fund screener', variant: 'h3' }));
  children.push(
    s.add('Text', {
      text: opts.hasLiveData
        ? `${funds.length} instruments · real-time data via Linkup`
        : `${funds.length} instruments · enable LINKUP_API_KEY for live data`,
      variant: 'caption',
    }),
  );

  for (const f of funds) {
    const row = s.add('Row', {
      children: [
        s.add('Column', {
          children: [
            s.add('Text', { text: `${f.ticker} · ${f.name}`, variant: 'body' }),
            s.add('Text', { text: `${f.category} · ${riskLabel(f.riskLevel)} · hist ${pct(f.historicalReturn)}`, variant: 'caption' }),
          ],
          align: 'start',
        }),
        s.add('Text', { text: pct(f.projectedReturn), variant: 'h5' }),
      ],
      justify: 'spaceBetween',
      align: 'center',
    });
    children.push(s.add('Card', { child: row }));
  }

  children.push(s.add('Divider', { axis: 'horizontal' }));
  const monteCarlo = s.add('Button', {
    child: s.add('Text', { text: 'Run Monte Carlo simulation' }),
    variant: 'primary',
    action: event('monte_carlo', { fundIds: funds.slice(0, 20).map((f) => f.id) }),
  });
  const invest = s.add('Button', {
    child: s.add('Text', { text: 'Invest across screened funds' }),
    variant: 'default',
    action: event('invest', { fundIds: funds.slice(0, 20).map((f) => f.id) }),
  });
  children.push(monteCarlo, invest);

  s.root('Column', { children, justify: 'start', align: 'stretch' });
  return envelope(s);
}

/** Confirmation surface shown after an investment is executed. */
export function buildConfirmation(message: string): A2uiMessage[] {
  const s = new Surface();
  const children = [
    s.add('Text', { text: '✅ Investment confirmed', variant: 'h3' }),
    s.add('Text', { text: message, variant: 'body' }),
    s.add('Button', {
      child: s.add('Text', { text: 'View my portfolio' }),
      variant: 'primary',
      action: event('view_report'),
    }),
  ];
  s.root('Column', { children, justify: 'start', align: 'stretch' });
  return envelope(s);
}

/** Maps the agent's componentType to the right A2UI surface. */
export function buildSurfaceFor(
  componentType: string | null,
  tier: UserTier,
  recommendation: string,
  funds: Fund[],
  opts: { hasLiveData?: boolean } = {},
): A2uiMessage[] | null {
  switch (componentType) {
    case 'beginner-choice':
      return buildBeginnerChoice(recommendation);
    case 'simple-choice':
      return buildSimpleChoice(recommendation, funds);
    case 'fund-grid':
      return buildFundGrid(funds.slice(0, 10));
    case 'advanced-screener':
      return buildAdvancedScreener(funds, { hasLiveData: !!opts.hasLiveData });
    case 'confirmation':
      return buildConfirmation(recommendation);
    default:
      return null;
  }
}
