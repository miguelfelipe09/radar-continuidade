import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

/** Tokens do sistema visual.
 *
 * Duas regras de cor governam o arquivo inteiro:
 *
 * 1. Índigo e violeta são exclusivos de marca e navegação. Nunca indicam o
 *    estado de um dado — por isso "queda" é ciano, não roxo.
 * 2. Cada severidade é um par: fundo bem claro e texto/ícone saturado da
 *    mesma família. Texto sobre cor usa o tom escuro da própria família,
 *    nunca preto puro.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Poppins', 'system-ui', 'sans-serif'] },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },

        // Marca e navegação
        sidebar: { DEFAULT: '#312E81', fg: '#C7D2FE', spark: '#A5B4FC' },
        acento: '#4338CA',

        // Severidades
        alta: { bg: '#FEE2E2', fg: '#B91C1C' },
        moderada: { bg: '#FEF3C7', fg: '#B45309' },
        normal: { bg: '#DCFCE7', fg: '#15803D' },
        ausente: { bg: '#F3F4F6', fg: '#4B5563' },
        // Ciano frio: normal e queda aparecem lado a lado e precisam se
        // distinguir sem ler o rótulo.
        queda: { bg: '#CFFAFE', fg: '#0E7490' },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        icone: '10px',
        badge: '4px',
      },
      boxShadow: { card: '0 1px 2px rgba(16,24,40,.04)' },
      fontSize: {
        titulo: ['36px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        secao: ['18px', { lineHeight: '1.3', fontWeight: '600' }],
        numero: ['22px', { lineHeight: '1.15', fontWeight: '700' }],
        rotulo: ['11px', { lineHeight: '1.3', letterSpacing: '0.06em', fontWeight: '600' }],
      },
      spacing: { sidebar: '288px', topbar: '65px' },
    },
  },
  plugins: [animate],
} satisfies Config;
