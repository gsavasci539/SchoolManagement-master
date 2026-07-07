import { ArrowLeft, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { DataTable } from "../../components/DataTable";
import { useToast } from "../../components/Toast";
import { AddButton, ConfirmDialog, ErrorState, Field, LoadingState, PageHeader } from "../../components/ui";
import { resources } from "../../config/resources";
import { api, apiMessage } from "../../lib/api";
import { useAuthStore } from "../../stores/auth";
import type { ApiResponse, DataRecord, FieldConfig, Paginated, SelectOption } from "../../types/api";

function normalize<T>(data: T[] | Paginated<T> | undefined): Paginated<T> {
  if (Array.isArray(data)) return { items: data, total: data.length, page: 1, page_size: data.length || 20, total_pages: 1 };
  return data || { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 };
}

export function ResourceListPage({ resourceKey }: { resourceKey: string }) {
  const config = resources[resourceKey];
  const basePath = resourceKey === "debts" ? "/finance/debts" : `/${resourceKey}`;
  const [rows, setRows] = useState<DataRecord[]>([]); const [page, setPage] = useState(1); const [total, setTotal] = useState(0); const [totalPages, setTotalPages] = useState(1); const [search, setSearch] = useState(""); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [deleting, setDeleting] = useState<DataRecord | null>(null); const [busy, setBusy] = useState(false);
  const can = useAuthStore((state) => state.can); const { showToast } = useToast();
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await api.get<ApiResponse<DataRecord[] | Paginated<DataRecord>>>(config.endpoint, { params: { page, page_size: 20, skip: (page - 1) * 20, limit: 20, search: search || undefined } });
      const result = normalize(response.data.data); setRows(result.items); setTotal(result.total); setTotalPages(result.total_pages || 1);
    } catch (err) { setError(apiMessage(err)); setRows([]); } finally { setLoading(false); }
  }, [config.endpoint, page, search]);
  useEffect(() => { const timer = window.setTimeout(load, search ? 320 : 0); return () => window.clearTimeout(timer); }, [load, search]);
  async function confirmDelete() { if (!deleting) return; setBusy(true); try { await api.delete(`${config.endpoint}/${deleting.id}`); showToast(`${config.singular} kaldırıldı`, "Kayıt güvenli biçimde pasife alındı."); setDeleting(null); await load(); } catch (err) { showToast("İşlem tamamlanamadı", apiMessage(err), "error"); } finally { setBusy(false); } }
  const write = can(config.permissionWrite);
  return <><PageHeader eyebrow="Kayıt yönetimi" title={config.title} description={config.description}>{write && <AddButton to={`${basePath}/new`} label={`${config.singular} ekle`} />}</PageHeader>{loading ? <div className="card"><LoadingState /></div> : error ? <div className="card"><ErrorState message={error} retry={load} /></div> : <DataTable rows={rows} columns={config.columns} search={search} onSearch={(value) => { setSearch(value); setPage(1); }} page={page} totalPages={totalPages} total={total} onPage={setPage} editBase={basePath} detailBase={config.detailPath} canEdit={write} onDelete={setDeleting} />}<ConfirmDialog open={Boolean(deleting)} busy={busy} onCancel={() => setDeleting(null)} onConfirm={confirmDelete} title={`${deleting?.first_name || deleting?.name || config.singular} kaydını kaldır?`} /></>;
}

type FormValues = Record<string, string | number | boolean>;

function getDefaults(fields: FieldConfig[], organizationId?: string | null) {
  return fields.reduce<FormValues>((acc, field) => { acc[field.name] = field.defaultValue ?? (field.type === "checkbox" ? false : field.name === "organization_id" ? organizationId || "" : ""); return acc; }, {});
}

export function ResourceFormPage({ resourceKey }: { resourceKey: string }) {
  const config = resources[resourceKey]; const { id } = useParams(); const editing = Boolean(id); const navigate = useNavigate(); const { showToast } = useToast(); const user = useAuthStore((state) => state.user);
  const basePath = resourceKey === "debts" ? "/finance/debts" : `/${resourceKey}`;
  const [loading, setLoading] = useState(editing); const [serverError, setServerError] = useState(""); const [options, setOptions] = useState<Record<string, SelectOption[]>>({});
  const defaults = useMemo(() => getDefaults(config.fields, user?.organization_id), [config.fields, user?.organization_id]);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({ defaultValues: defaults });

  useEffect(() => {
    const sources = [...new Set(config.fields.map((field) => field.optionSource).filter(Boolean))] as string[];
    Promise.all(sources.map(async (source) => {
      try { const response = await api.get<ApiResponse<DataRecord[] | Paginated<DataRecord>>>(source, { params: { page_size: 100, limit: 100 } }); return [source, normalize(response.data.data).items] as const; } catch { return [source, []] as const; }
    })).then((entries) => {
      const mapped: Record<string, SelectOption[]> = {};
      for (const [source, items] of entries) mapped[source] = items.map((item) => ({ value: String(item.id), label: [item.name, item.first_name, item.last_name].filter(Boolean).join(" ") }));
      setOptions(mapped);
    });
  }, [config.fields]);

  useEffect(() => {
    if (!id) return;
    api.get<ApiResponse<DataRecord>>(`${config.endpoint}/${id}`).then((response) => {
      const record = response.data.data; const values = { ...defaults };
      for (const field of config.fields) { const value = record?.[field.name]; if (value !== undefined && value !== null) values[field.name] = field.type === "date" ? String(value).slice(0, 10) : (value as string | number | boolean); }
      reset(values);
    }).catch((error) => setServerError(apiMessage(error))).finally(() => setLoading(false));
  }, [config.endpoint, config.fields, defaults, id, reset]);

  const submit = async (values: FormValues) => {
    setServerError("");
    const payload = Object.fromEntries(Object.entries(values).filter(([, value]) => value !== ""));
    for (const field of config.fields) if (field.type === "number" && payload[field.name] !== undefined) payload[field.name] = Number(payload[field.name]);
    try {
      if (editing) await api.put(`${config.endpoint}/${id}`, payload); else await api.post(config.endpoint, payload);
      showToast(`${config.singular} ${editing ? "güncellendi" : "oluşturuldu"}`, "Değişiklikler başarıyla kaydedildi."); navigate(basePath);
    } catch (error) { setServerError(apiMessage(error)); }
  };
  if (loading) return <div className="card"><LoadingState label="Kayıt açılıyor" /></div>;
  return <><PageHeader eyebrow={editing ? "Kayıt düzenleme" : "Yeni kayıt"} title={`${config.singular} ${editing ? "düzenle" : "ekle"}`} description={`Zorunlu alanları doldurarak ${config.singular.toLocaleLowerCase("tr-TR")} kaydını tamamlayın.`}><Link className="btn btn-secondary" to={basePath}><ArrowLeft size={16} />Listeye dön</Link></PageHeader><form className="card form-card" onSubmit={handleSubmit(submit)} noValidate><div className="form-section"><h2>Temel bilgiler</h2><p>Bu bilgiler kurum içindeki ilgili ekranlarda kullanılır.</p><div className="form-grid">{config.fields.filter((field) => !(editing && field.hideOnEdit)).map((field) => <DynamicField key={field.name} field={field} options={field.options || (field.optionSource ? options[field.optionSource] : []) || []} register={register} error={errors[field.name]?.message as string | undefined} editing={editing} />)}</div></div>{serverError && <div className="field-error" role="alert" style={{ marginTop: 18, padding: 12, borderRadius: 10, background: "#fff0ef" }}>{serverError}</div>}<div className="form-actions"><Link className="btn btn-secondary" to={basePath}>Vazgeç</Link><button className="btn btn-primary" disabled={isSubmitting}><Save size={16} />{isSubmitting ? "Kaydediliyor…" : "Kaydet"}</button></div></form></>;
}

function DynamicField({ field, options, register, error, editing }: { field: FieldConfig; options: SelectOption[]; register: ReturnType<typeof useForm<FormValues>>["register"]; error?: string; editing: boolean }) {
  const rules = { required: field.required && !(editing && field.hideOnEdit) ? `${field.label} zorunludur.` : false, min: field.min ? { value: field.min, message: `En az ${field.min} olmalıdır.` } : undefined };
  if (field.type === "checkbox") return <Field label={field.label} error={error} full={field.full}><label className="checkbox-line"><input type="checkbox" {...register(field.name, rules)} />Etkin</label></Field>;
  if (field.type === "textarea") return <Field label={field.label} error={error} required={field.required} full={field.full}><textarea placeholder={field.placeholder} {...register(field.name, rules)} /></Field>;
  if (field.type === "select") return <Field label={field.label} error={error} required={field.required} full={field.full}><select {...register(field.name, rules)}><option value="">Seçiniz</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>;
  return <Field label={field.label} error={error} required={field.required} full={field.full}><input type={field.type || "text"} placeholder={field.placeholder} step={field.type === "number" ? "0.01" : undefined} {...register(field.name, rules)} /></Field>;
}
