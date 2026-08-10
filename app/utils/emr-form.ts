import type { EmrFormCatalogItem, EmrFormField, EmrFormValue, EmrFormValues } from '~/types/emr-form'

export interface ResolvedFormCatalog {
  items: EmrFormCatalogItem[]
  selectedKey: string
}

export function resolveFormCatalog(items: EmrFormCatalogItem[], area: string, requestedKey = ''): ResolvedFormCatalog {
  const areaItems = items.filter((item) => item.area === area)
  const selectedKey = areaItems.some((item) => item.key === requestedKey)
    ? requestedKey
    : (areaItems[0]?.key ?? '')

  return { items: areaItems, selectedKey }
}

function initialValue(field: EmrFormField, source: EmrFormValues): EmrFormValue {
  const value = source[field.name] ?? field.default

  if (value !== undefined && value !== null) {
    if (field.type === 'checkbox') return value === true || value === 1 || value === '1'
    if ((field.type === 'datetime' || field.type === 'datetime-local') && typeof value === 'string') return value.replace(' ', 'T').slice(0, 16)
    return value
  }

  return field.type === 'checkbox' ? false : ''
}

export function initializeFormValues(fields: EmrFormField[], source: EmrFormValues = {}): EmrFormValues {
  return Object.fromEntries(fields.map((field) => [field.name, initialValue(field, source)]))
}

export function writableFormValues(fields: EmrFormField[], source: EmrFormValues): EmrFormValues {
  const values: EmrFormValues = {}

  for (const field of fields) {
    if (field.read_only) continue
    const value = source[field.name]

    if (field.type === 'number' || field.type === 'integer') {
      values[field.name] = value === '' || value === null || value === undefined ? null : Number(value)
    } else if (field.type === 'checkbox') {
      values[field.name] = Boolean(value)
    } else if ((field.type === 'datetime' || field.type === 'datetime-local') && typeof value === 'string') {
      values[field.name] = value.length === 16 ? `${value}:00` : value
    } else {
      values[field.name] = value === '' && field.nullable ? null : (value ?? null)
    }
  }

  return values
}

export function displayFormValue(field: EmrFormField, value: EmrFormValue | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  if (field.type === 'checkbox') return value === true || value === 1 || value === '1' ? 'Ya' : 'Tidak'
  if (field.type === 'select') return field.options?.find((option) => option.value === value || String(option.value) === String(value))?.label ?? String(value)

  if ((field.type === 'date' || field.type === 'datetime' || field.type === 'datetime-local') && typeof value === 'string') {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat('id-ID', field.type === 'datetime' || field.type === 'datetime-local'
        ? { dateStyle: 'medium', timeStyle: 'short' }
        : { dateStyle: 'medium' }).format(date)
    }
  }

  return String(value)
}
