import type { Config } from 'tailwindcss';

const config: Config = {
    darkMode: ['class'],
    content: [
  './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
  './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  './src/app/**/*.{js,ts,jsx,tsx,mdx}',
 ],
 theme: {
 	extend: {
 		colors: {
 			primary: {
 				DEFAULT: 'hsl(var(--primary))',
 				foreground: 'hsl(var(--primary-foreground))'
 			},
 			hero: {
 				start: '#05294F',
 				end: '#07478F'
 			},
 			burgundy: {
 				DEFAULT: '#8B2E34',
 				foreground: '#FFFFFF'
 			},
 			'text-dark': '#201816',
 			'bg-form': '#F1F1F1',
 			whatsapp: '#25D366',
 			status: {
 				pool: '#3B82F6',
 				taken: '#F59E0B',
 				completed: '#10B981',
 				rejected: '#EF4444'
 			},
 			background: 'hsl(var(--background))',
 			foreground: 'hsl(var(--foreground))',
 			card: {
 				DEFAULT: 'hsl(var(--card))',
 				foreground: 'hsl(var(--card-foreground))'
 			},
 			popover: {
 				DEFAULT: 'hsl(var(--popover))',
 				foreground: 'hsl(var(--popover-foreground))'
 			},
 			secondary: {
 				DEFAULT: 'hsl(var(--secondary))',
 				foreground: 'hsl(var(--secondary-foreground))'
 			},
 			muted: {
 				DEFAULT: 'hsl(var(--muted))',
 				foreground: 'hsl(var(--muted-foreground))'
 			},
 			accent: {
 				DEFAULT: 'hsl(var(--accent))',
 				foreground: 'hsl(var(--accent-foreground))'
 			},
 			destructive: {
 				DEFAULT: 'hsl(var(--destructive))',
 				foreground: 'hsl(var(--destructive-foreground))'
 			},
 			border: 'hsl(var(--border))',
 			input: 'hsl(var(--input))',
 			ring: 'hsl(var(--ring))',
 			chart: {
 				'1': 'hsl(var(--chart-1))',
 				'2': 'hsl(var(--chart-2))',
 				'3': 'hsl(var(--chart-3))',
 				'4': 'hsl(var(--chart-4))',
 				'5': 'hsl(var(--chart-5))'
 			}
 		},
 		fontFamily: {
 			sans: [
 				'var(--font-montserrat)',
 				'system-ui',
 				'sans-serif'
 			],
 			montserrat: [
 				'var(--font-montserrat)',
 				'sans-serif'
 			]
 		},
 		fontWeight: {
 			title: '800',
 			subtitle: '700',
 			body: '400'
 		},
 		fontSize: {
 			'title-xl': [
 				'50px',
 				{
 					lineHeight: '1.1',
 					fontWeight: '800'
 				}
 			],
 			'title-lg': [
 				'40px',
 				{
 					lineHeight: '1.2',
 					fontWeight: '800'
 				}
 			],
 			'title-md': [
 				'32px',
 				{
 					lineHeight: '1.3',
 					fontWeight: '700'
 				}
 			],
 			'title-sm': [
 				'24px',
 				{
 					lineHeight: '1.4',
 					fontWeight: '700'
 				}
 			]
 		},
 		borderRadius: {
 			button: '10px',
 			card: '15px',
 			input: '10px',
 			lg: 'var(--radius)',
 			md: 'calc(var(--radius) - 2px)',
 			sm: 'calc(var(--radius) - 4px)'
 		},
 		boxShadow: {
 			card: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
 			'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
 		},
 		backgroundImage: {
 			'hero-gradient': 'linear-gradient(135deg, #05294F 0%, #07478F 100%)',
 			'burgundy-gradient': 'linear-gradient(135deg, #8B2E34 0%, #AB2820 100%)',
 			'button-gradient': 'linear-gradient(135deg, #8B2E34 0%, #AB2820 100%)'
 		},
 		animation: {
 			'fade-in': 'fadeIn 0.3s ease-in-out',
 			'slide-up': 'slideUp 0.3s ease-out',
 			'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite'
 		},
 		keyframes: {
 			fadeIn: {
 				'0%': {
 					opacity: '0'
 				},
 				'100%': {
 					opacity: '1'
 				}
 			},
 			slideUp: {
 				'0%': {
 					opacity: '0',
 					transform: 'translateY(10px)'
 				},
 				'100%': {
 					opacity: '1',
 					transform: 'translateY(0)'
 				}
 			}
 		}
 	}
 },
 plugins: [require("tailwindcss-animate")],
};

export default config;
