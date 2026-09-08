import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

/**
 * El contenido vive fuera de los componentes.
 * Cada colección puede migrarse después a un CMS sin tocar la interfaz.
 *
 * `demo: true` marca material de maquetación que la interfaz señala de
 * forma explícita para no presentarlo como producción real del centro.
 */

const fileLink = z.object({
  label: z.string(),
  href: z.string(),
  kind: z.enum(['pdf', 'datos', 'codigo', 'anexo', 'presentacion', 'enlace']).default('enlace'),
  note: z.string().optional(),
});

const publicaciones = defineCollection({
  loader: glob({ base: './src/content/publicaciones', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    /* Las nueve familias de documento del centro. El orden es el de la
       jerarquía editorial, no alfabético. */
    type: z.enum([
      'Informe',
      'Reporte',
      'Working Paper',
      'Boletín',
      'Nota técnica',
      'Policy Brief',
      'Memoria institucional',
      'Estudio especial',
      'Documento metodológico',
    ]),
    serial: z.string().optional(),
    date: z.coerce.date(),
    authors: z.array(z.string()).min(1),
    abstract: z.string(),
    findings: z.array(z.string()).default([]),
    topics: z.array(z.string()).default([]),
    keywords: z.array(z.string()).default([]),
    jel: z.array(z.string()).default([]),
    files: z.array(fileLink).default([]),
    externalUrl: z.string().url().optional(),
    doi: z.string().optional(),
    pages: z.number().optional(),
    featured: z.boolean().default(false),
    demo: z.boolean().default(false),
  }),
});

const eventos = defineCollection({
  loader: glob({ base: './src/content/eventos', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    type: z.enum(['Seminario', 'Conferencia', 'Webinar', 'Presentación', 'Curso', 'Call for Papers']),
    date: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    time: z.string().optional(),
    location: z.string(),
    modality: z.enum(['Presencial', 'Virtual', 'Híbrido']).default('Híbrido'),
    summary: z.string(),
    speakers: z.array(z.object({ name: z.string(), affiliation: z.string().optional() })).default([]),
    registerUrl: z.string().optional(),
    resources: z.array(fileLink).default([]),
    demo: z.boolean().default(false),
  }),
});

const investigadores = defineCollection({
  loader: glob({ base: './src/content/investigadores', pattern: '**/*.md' }),
  schema: z.object({
    name: z.string(),
    role: z.string(),
    area: z.string(),
    bio: z.string(),
    photo: z.string().optional(),
    order: z.number().default(99),
    links: z
      .object({
        orcid: z.string().optional(),
        scholar: z.string().optional(),
        repec: z.string().optional(),
        linkedin: z.string().optional(),
        email: z.string().optional(),
      })
      .default({}),
    demo: z.boolean().default(false),
  }),
});

const formacion = defineCollection({
  loader: glob({ base: './src/content/formacion', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    shortTitle: z.string(),
    /* La oferta ya no es solo de diplomados: hay cursos de experto, cursos
       rápidos y talleres. El orden es el de duración, de más a menos. */
    kind: z
      .enum(['Diplomado', 'Curso de experto', 'Curso', 'Curso rápido', 'Taller'])
      .default('Diplomado'),
    modality: z.string(),
    weeks: z.number(),
    schedule: z.array(z.string()).default([]),
    tools: z.array(z.string()).default([]),
    summary: z.string(),
    objective: z.string(),
    audience: z.array(z.string()).default([]),
    modules: z
      .array(
        z.object({
          n: z.string(),
          title: z.string(),
          items: z.array(z.string()).default([]),
        }),
      )
      .default([]),
    faculty: z
      .array(
        z.object({
          name: z.string(),
          highlights: z.array(z.string()).default([]),
        }),
      )
      .default([]),
    certification: z.string(),
    certificates: z.array(z.string()).default([]),
    partners: z.array(z.string()).default([]),
    requirements: z.array(z.string()).default([]),
    price: z.object({
      matricula: z.number(),
      colegiatura: z.number(),
      total: z.number(),
      promo: z.number().optional(),
      promoNote: z.string().optional(),
      currency: z.string().default('Bs'),
    }),
    contact: z.array(z.string()).default([]),
    open: z.boolean().default(true),
    order: z.number().default(99),
  }),
});

const archivo = defineCollection({
  loader: file('./src/data/archivo.json'),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    kind: z.enum([
      'Publicación',
      'Base de datos',
      'Presentación',
      'Documento histórico',
      'Metodología',
      'Libro',
      'Recurso',
    ]),
    year: z.number(),
    author: z.string().optional(),
    description: z.string(),
    href: z.string().optional(),
    format: z.string().optional(),
    size: z.string().optional(),
    views: z.number().default(0),
    topics: z.array(z.string()).default([]),
    demo: z.boolean().default(false),
  }),
});

export const collections = { publicaciones, eventos, investigadores, formacion, archivo };
