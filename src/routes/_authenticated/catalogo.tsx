import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Loader2, Trash2, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  listSpecialtiesAdmin,
  listPanettoniAdmin,
  updateSpecialty,
  updatePanettone,
  createSpecialty,
  createPanettone,
  deleteSpecialty,
  deletePanettone,
  listCakeOptionsAdmin,
  createCakeBase,
  updateCakeBase,
  deleteCakeBase,
  createCakeFilling,
  updateCakeFilling,
  deleteCakeFilling,
  createCakeSize,
  updateCakeSize,
  deleteCakeSize,
  createCakeAddon,
  updateCakeAddon,
  deleteCakeAddon,
} from "@/lib/catalog-admin.functions";
import { uploadProductImage, ProductImageUploadError } from "@/lib/product-images";

export const Route = createFileRoute("/_authenticated/catalogo")({
  head: () => ({
    meta: [{ title: "Catalogo — Backoffice" }, { name: "robots", content: "noindex" }],
  }),
  component: CatalogoPage,
});

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  price_hint: string | null;
  price: number | null;
  quantity: number | null;
  active: boolean;
};

type Folder = "specialita" | "panettoni";

function CatalogoPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-primary">Catalogo</h1>
        <p className="text-sm text-muted-foreground">
          Modifica nome, prezzo, quantità e immagine dei prodotti mostrati sul sito. Quando la
          quantità arriva a 0 il prodotto sparisce dalla vetrina pubblica finché non lo ricarichi.
        </p>
      </div>
      <Tabs defaultValue="specialita">
        <TabsList>
          <TabsTrigger value="specialita">Specialità</TabsTrigger>
          <TabsTrigger value="panettoni">Panettoni</TabsTrigger>
          <TabsTrigger value="torta">Torta personalizzata</TabsTrigger>
        </TabsList>
        <TabsContent value="specialita" className="mt-6">
          <ProductGrid
            queryKey="admin-specialties"
            folder="specialita"
            fetcher={listSpecialtiesAdmin}
            updater={updateSpecialty}
            creator={createSpecialty}
            deleter={deleteSpecialty}
          />
        </TabsContent>
        <TabsContent value="panettoni" className="mt-6">
          <ProductGrid
            queryKey="admin-panettoni"
            folder="panettoni"
            fetcher={listPanettoniAdmin}
            updater={updatePanettone}
            creator={createPanettone}
            deleter={deletePanettone}
          />
        </TabsContent>
        <TabsContent value="torta" className="mt-6">
          <CakeOptionsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProductGrid({
  queryKey,
  folder,
  fetcher,
  updater,
  creator,
  deleter,
}: {
  queryKey: string;
  folder: Folder;
  fetcher: typeof listSpecialtiesAdmin;
  updater: typeof updateSpecialty;
  creator: typeof createSpecialty;
  deleter: typeof deleteSpecialty;
}) {
  const fetchProducts = useServerFn(fetcher);
  const { data, isLoading, error } = useQuery({
    queryKey: [queryKey],
    queryFn: () => fetchProducts(),
  });

  if (isLoading)
    return (
      <div className="rounded-xl bg-card p-8 text-center text-muted-foreground">Caricamento...</div>
    );
  if (error)
    return (
      <div className="rounded-xl bg-destructive/10 p-4 text-destructive">
        {error instanceof Error ? error.message : "Errore"}
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <AddProductDialog queryKey={queryKey} folder={folder} creator={creator} />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            queryKey={queryKey}
            folder={folder}
            updater={updater}
            deleter={deleter}
          />
        ))}
        {(data ?? []).length === 0 && (
          <div className="col-span-full rounded-xl bg-card p-8 text-center text-muted-foreground ring-1 ring-border">
            Nessun prodotto. Aggiungine uno per iniziare.
          </div>
        )}
      </div>
    </div>
  );
}

function AddProductDialog({
  queryKey,
  folder,
  creator,
}: {
  queryKey: string;
  folder: Folder;
  creator: typeof createSpecialty;
}) {
  const qc = useQueryClient();
  const runCreate = useServerFn(creator);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const mutation = useMutation({
    mutationFn: (v: {
      name: string;
      price: number | null;
      quantity: number | null;
      image_url: string | null;
    }) => runCreate({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKey] });
      qc.invalidateQueries({ queryKey: [folder === "specialita" ? "specialties" : "panettoni"] });
      toast.success("Prodotto aggiunto");
      setOpen(false);
      setName("");
      setPrice("");
      setQuantity("");
      setImageUrl("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Errore salvataggio"),
  });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadProductImage(file, folder);
      setImageUrl(url);
      toast.success("Immagine caricata");
    } catch (err) {
      toast.error(
        err instanceof ProductImageUploadError ? err.message : "Errore caricamento immagine",
      );
    } finally {
      setUploading(false);
    }
  }

  function handleCreate() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Il nome non può essere vuoto");
      return;
    }
    const parsedPrice = price.trim() === "" ? null : Number(price.replace(",", "."));
    if (parsedPrice != null && (Number.isNaN(parsedPrice) || parsedPrice < 0)) {
      toast.error("Prezzo non valido");
      return;
    }
    const parsedQuantity = quantity.trim() === "" ? null : Number(quantity);
    if (parsedQuantity != null && (!Number.isInteger(parsedQuantity) || parsedQuantity < 0)) {
      toast.error("Quantità non valida");
      return;
    }
    mutation.mutate({
      name: trimmedName,
      price: parsedPrice,
      quantity: parsedQuantity,
      image_url: imageUrl.trim() || null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-4 w-4" /> Aggiungi prodotto
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuovo prodotto</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="new-name">Nome prodotto</Label>
            <Input
              id="new-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="new-price">Prezzo (€)</Label>
              <Input
                id="new-price"
                type="number"
                step="0.01"
                min="0"
                placeholder="Es. 4.50"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="new-quantity">Quantità disponibile</Label>
              <Input
                id="new-quantity"
                type="number"
                step="1"
                min="0"
                placeholder="Vuoto = illimitata"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Immagine</Label>
            <div className="mt-1 flex items-center gap-3">
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt=""
                  className="h-14 w-14 rounded-lg object-cover ring-1 ring-border"
                />
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="mr-1 h-3.5 w-3.5" />
                )}
                {imageUrl ? "Cambia immagine" : "Carica immagine"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" disabled={mutation.isPending || uploading} onClick={handleCreate}>
            {mutation.isPending ? "Creazione..." : "Crea prodotto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProductCard({
  product,
  queryKey,
  folder,
  updater,
  deleter,
}: {
  product: Product;
  queryKey: string;
  folder: Folder;
  updater: typeof updateSpecialty;
  deleter: typeof deleteSpecialty;
}) {
  const qc = useQueryClient();
  const runUpdate = useServerFn(updater);
  const runDelete = useServerFn(deleter);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(product.price != null ? String(product.price) : "");
  const [quantity, setQuantity] = useState(
    product.quantity != null ? String(product.quantity) : "",
  );
  const [imageUrl, setImageUrl] = useState(product.image_url ?? "");
  const [uploading, setUploading] = useState(false);

  function invalidate() {
    qc.invalidateQueries({ queryKey: [queryKey] });
    qc.invalidateQueries({ queryKey: [folder === "specialita" ? "specialties" : "panettoni"] });
  }

  const mutation = useMutation({
    mutationFn: (v: {
      id: string;
      name: string;
      price: number | null;
      quantity: number | null;
      image_url: string | null;
    }) => runUpdate({ data: v }),
    onSuccess: () => {
      invalidate();
      toast.success("Prodotto aggiornato");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Errore salvataggio"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => runDelete({ data: { id: product.id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Prodotto eliminato");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Errore eliminazione"),
  });

  const dirty =
    name.trim() !== product.name ||
    price !== (product.price != null ? String(product.price) : "") ||
    quantity !== (product.quantity != null ? String(product.quantity) : "") ||
    imageUrl !== (product.image_url ?? "");

  const soldOut = product.quantity != null && product.quantity <= 0;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadProductImage(file, folder);
      setImageUrl(url);
      toast.success("Immagine caricata — ricordati di salvare");
    } catch (err) {
      toast.error(
        err instanceof ProductImageUploadError ? err.message : "Errore caricamento immagine",
      );
    } finally {
      setUploading(false);
    }
  }

  function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Il nome non può essere vuoto");
      return;
    }
    const parsedPrice = price.trim() === "" ? null : Number(price.replace(",", "."));
    if (parsedPrice != null && (Number.isNaN(parsedPrice) || parsedPrice < 0)) {
      toast.error("Prezzo non valido");
      return;
    }
    const parsedQuantity = quantity.trim() === "" ? null : Number(quantity);
    if (parsedQuantity != null && (!Number.isInteger(parsedQuantity) || parsedQuantity < 0)) {
      toast.error("Quantità non valida");
      return;
    }
    mutation.mutate({
      id: product.id,
      name: trimmedName,
      price: parsedPrice,
      quantity: parsedQuantity,
      image_url: imageUrl.trim() || null,
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border">
      <div className="group relative aspect-[4/3] overflow-hidden bg-secondary">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            Nessuna immagine
          </div>
        )}
        {soldOut && (
          <span className="absolute left-2 top-2 rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold text-destructive-foreground">
            Esaurito
          </span>
        )}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100 disabled:cursor-wait"
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <span className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold">
              <Upload className="h-3.5 w-3.5" /> Cambia immagine
            </span>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      <div className="space-y-3 p-4">
        <div>
          <Label htmlFor={`name-${product.id}`} className="text-xs">
            Nome prodotto
          </Label>
          <Input
            id={`name-${product.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor={`price-${product.id}`} className="text-xs">
              Prezzo (€)
            </Label>
            <Input
              id={`price-${product.id}`}
              type="number"
              step="0.01"
              min="0"
              placeholder="Es. 4.50"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`qty-${product.id}`} className="text-xs">
              Quantità
            </Label>
            <Input
              id={`qty-${product.id}`}
              type="number"
              step="1"
              min="0"
              placeholder="Illimitata"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            className="flex-1"
            disabled={!dirty || mutation.isPending || uploading}
            onClick={handleSave}
          >
            {mutation.isPending ? "Salvataggio..." : "Salva modifiche"}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="outline"
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Eliminare "{product.name}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  Il prodotto sparirà subito dal sito pubblico. L'operazione non è reversibile.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteMutation.mutate()}>
                  Elimina
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

type NameOption = { id: string; name: string; description: string | null; active: boolean };
type SizeOption = {
  id: string;
  label: string;
  servings: number;
  price: number | null;
  active: boolean;
};
type AddonOption = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  active: boolean;
};

function CakeOptionsPanel() {
  const fetchOptions = useServerFn(listCakeOptionsAdmin);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-cake-options"],
    queryFn: () => fetchOptions(),
  });

  if (isLoading)
    return (
      <div className="rounded-xl bg-card p-8 text-center text-muted-foreground">Caricamento...</div>
    );
  if (error)
    return (
      <div className="rounded-xl bg-destructive/10 p-4 text-destructive">
        {error instanceof Error ? error.message : "Errore"}
      </div>
    );
  if (!data) return null;

  return (
    <Tabs defaultValue="basi">
      <TabsList>
        <TabsTrigger value="basi">Basi</TabsTrigger>
        <TabsTrigger value="farciture">Farciture</TabsTrigger>
        <TabsTrigger value="dimensioni">Dimensioni</TabsTrigger>
        <TabsTrigger value="aggiunte">Aggiunte</TabsTrigger>
      </TabsList>
      <TabsContent value="basi" className="mt-4">
        <NameOptionList
          items={data.bases}
          creator={createCakeBase}
          updater={updateCakeBase}
          deleter={deleteCakeBase}
          namePlaceholder="Es. Pan di Spagna"
          addLabel="Aggiungi base"
        />
      </TabsContent>
      <TabsContent value="farciture" className="mt-4">
        <NameOptionList
          items={data.fillings}
          creator={createCakeFilling}
          updater={updateCakeFilling}
          deleter={deleteCakeFilling}
          namePlaceholder="Es. Crema chantilly"
          addLabel="Aggiungi farcitura"
        />
      </TabsContent>
      <TabsContent value="dimensioni" className="mt-4">
        <SizeOptionList items={data.sizes} />
      </TabsContent>
      <TabsContent value="aggiunte" className="mt-4">
        <AddonOptionList items={data.addons} />
      </TabsContent>
    </Tabs>
  );
}

function invalidateCakeOptions(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["admin-cake-options"] });
  qc.invalidateQueries({ queryKey: ["cake-options"] });
}

function NameOptionList({
  items,
  creator,
  updater,
  deleter,
  namePlaceholder,
  addLabel,
}: {
  items: NameOption[];
  creator: typeof createCakeBase;
  updater: typeof updateCakeBase;
  deleter: typeof deleteCakeBase;
  namePlaceholder: string;
  addLabel: string;
}) {
  const qc = useQueryClient();
  const runCreate = useServerFn(creator);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      runCreate({ data: { name: name.trim(), description: description.trim() || null } }),
    onSuccess: () => {
      invalidateCakeOptions(qc);
      toast.success("Aggiunta");
      setName("");
      setDescription("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Errore salvataggio"),
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2 rounded-xl bg-card p-4 ring-1 ring-border">
        <div className="min-w-[160px] flex-1">
          <Label htmlFor="opt-name">Nome</Label>
          <Input
            id="opt-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            placeholder={namePlaceholder}
          />
        </div>
        <div className="min-w-[200px] flex-[2]">
          <Label htmlFor="opt-desc">Descrizione (opzionale)</Label>
          <Input
            id="opt-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
          />
        </div>
        <Button
          type="button"
          disabled={!name.trim() || createMutation.isPending}
          onClick={() => createMutation.mutate()}
        >
          <Plus className="mr-1 h-4 w-4" /> {addLabel}
        </Button>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <NameOptionRow key={item.id} item={item} updater={updater} deleter={deleter} />
        ))}
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">Nessuna opzione. Aggiungine una.</p>
        )}
      </div>
    </div>
  );
}

function NameOptionRow({
  item,
  updater,
  deleter,
}: {
  item: NameOption;
  updater: typeof updateCakeBase;
  deleter: typeof deleteCakeBase;
}) {
  const qc = useQueryClient();
  const runUpdate = useServerFn(updater);
  const runDelete = useServerFn(deleter);
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? "");
  const [active, setActive] = useState(item.active);

  const dirty =
    name.trim() !== item.name || description !== (item.description ?? "") || active !== item.active;

  const updateMutation = useMutation({
    mutationFn: () =>
      runUpdate({
        data: { id: item.id, name: name.trim(), description: description.trim() || null, active },
      }),
    onSuccess: () => {
      invalidateCakeOptions(qc);
      toast.success("Aggiornata");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Errore salvataggio"),
  });
  const deleteMutation = useMutation({
    mutationFn: () => runDelete({ data: { id: item.id } }),
    onSuccess: () => {
      invalidateCakeOptions(qc);
      toast.success("Eliminata");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Errore eliminazione"),
  });

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl bg-card p-3 ring-1 ring-border">
      <div className="min-w-[160px] flex-1">
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
      </div>
      <div className="min-w-[200px] flex-[2]">
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          placeholder="Descrizione"
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={active} onCheckedChange={setActive} />
        <span className="text-xs text-muted-foreground">{active ? "Attiva" : "Nascosta"}</span>
      </div>
      <Button
        type="button"
        size="sm"
        disabled={!dirty || updateMutation.isPending}
        onClick={() => updateMutation.mutate()}
      >
        Salva
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" size="icon" variant="outline" disabled={deleteMutation.isPending}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare "{item.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Sparirà subito dal configuratore. L'operazione non è reversibile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()}>Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SizeOptionList({ items }: { items: SizeOption[] }) {
  const qc = useQueryClient();
  const runCreate = useServerFn(createCakeSize);
  const [label, setLabel] = useState("");
  const [servings, setServings] = useState("");
  const [price, setPrice] = useState("");

  const createMutation = useMutation({
    mutationFn: (v: { label: string; servings: number; price: number | null }) =>
      runCreate({ data: v }),
    onSuccess: () => {
      invalidateCakeOptions(qc);
      toast.success("Dimensione aggiunta");
      setLabel("");
      setServings("");
      setPrice("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Errore salvataggio"),
  });

  function handleCreate() {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      toast.error("Il nome non può essere vuoto");
      return;
    }
    const parsedServings = Number(servings);
    if (!Number.isInteger(parsedServings) || parsedServings < 1) {
      toast.error("Numero persone non valido");
      return;
    }
    const parsedPrice = price.trim() === "" ? null : Number(price.replace(",", "."));
    if (parsedPrice != null && (Number.isNaN(parsedPrice) || parsedPrice < 0)) {
      toast.error("Prezzo non valido");
      return;
    }
    createMutation.mutate({ label: trimmedLabel, servings: parsedServings, price: parsedPrice });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2 rounded-xl bg-card p-4 ring-1 ring-border">
        <div className="min-w-[140px] flex-1">
          <Label htmlFor="size-label">Nome dimensione</Label>
          <Input
            id="size-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={80}
            placeholder="Es. Media"
          />
        </div>
        <div className="w-28">
          <Label htmlFor="size-servings">Persone</Label>
          <Input
            id="size-servings"
            type="number"
            min="1"
            step="1"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
          />
        </div>
        <div className="w-32">
          <Label htmlFor="size-price">Prezzo (€)</Label>
          <Input
            id="size-price"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Es. 25.00"
          />
        </div>
        <Button type="button" disabled={createMutation.isPending} onClick={handleCreate}>
          <Plus className="mr-1 h-4 w-4" /> Aggiungi dimensione
        </Button>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <SizeOptionRow key={item.id} item={item} />
        ))}
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">Nessuna dimensione. Aggiungine una.</p>
        )}
      </div>
    </div>
  );
}

function SizeOptionRow({ item }: { item: SizeOption }) {
  const qc = useQueryClient();
  const runUpdate = useServerFn(updateCakeSize);
  const runDelete = useServerFn(deleteCakeSize);
  const [label, setLabel] = useState(item.label);
  const [servings, setServings] = useState(String(item.servings));
  const [price, setPrice] = useState(item.price != null ? String(item.price) : "");
  const [active, setActive] = useState(item.active);

  const dirty =
    label.trim() !== item.label ||
    servings !== String(item.servings) ||
    price !== (item.price != null ? String(item.price) : "") ||
    active !== item.active;

  const updateMutation = useMutation({
    mutationFn: (v: { label: string; servings: number; price: number | null; active: boolean }) =>
      runUpdate({ data: { id: item.id, ...v } }),
    onSuccess: () => {
      invalidateCakeOptions(qc);
      toast.success("Aggiornata");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Errore salvataggio"),
  });
  const deleteMutation = useMutation({
    mutationFn: () => runDelete({ data: { id: item.id } }),
    onSuccess: () => {
      invalidateCakeOptions(qc);
      toast.success("Eliminata");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Errore eliminazione"),
  });

  function handleSave() {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      toast.error("Il nome non può essere vuoto");
      return;
    }
    const parsedServings = Number(servings);
    if (!Number.isInteger(parsedServings) || parsedServings < 1) {
      toast.error("Numero persone non valido");
      return;
    }
    const parsedPrice = price.trim() === "" ? null : Number(price.replace(",", "."));
    if (parsedPrice != null && (Number.isNaN(parsedPrice) || parsedPrice < 0)) {
      toast.error("Prezzo non valido");
      return;
    }
    updateMutation.mutate({
      label: trimmedLabel,
      servings: parsedServings,
      price: parsedPrice,
      active,
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl bg-card p-3 ring-1 ring-border">
      <div className="min-w-[140px] flex-1">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} />
      </div>
      <div className="w-24">
        <Input
          type="number"
          min="1"
          step="1"
          value={servings}
          onChange={(e) => setServings(e.target.value)}
        />
      </div>
      <div className="w-28">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Facoltativo"
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={active} onCheckedChange={setActive} />
        <span className="text-xs text-muted-foreground">{active ? "Attiva" : "Nascosta"}</span>
      </div>
      <Button
        type="button"
        size="sm"
        disabled={!dirty || updateMutation.isPending}
        onClick={handleSave}
      >
        Salva
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" size="icon" variant="outline" disabled={deleteMutation.isPending}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare "{item.label}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Sparirà subito dal configuratore. L'operazione non è reversibile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()}>Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AddonOptionList({ items }: { items: AddonOption[] }) {
  const qc = useQueryClient();
  const runCreate = useServerFn(createCakeAddon);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  const createMutation = useMutation({
    mutationFn: (v: { name: string; description: string | null; price: number }) =>
      runCreate({ data: v }),
    onSuccess: () => {
      invalidateCakeOptions(qc);
      toast.success("Aggiunta aggiunta");
      setName("");
      setDescription("");
      setPrice("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Errore salvataggio"),
  });

  function handleCreate() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Il nome non può essere vuoto");
      return;
    }
    const parsedPrice = Number(price.replace(",", ".") || "0");
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      toast.error("Prezzo non valido");
      return;
    }
    createMutation.mutate({
      name: trimmedName,
      description: description.trim() || null,
      price: parsedPrice,
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2 rounded-xl bg-card p-4 ring-1 ring-border">
        <div className="min-w-[160px] flex-1">
          <Label htmlFor="addon-name">Nome aggiunta</Label>
          <Input
            id="addon-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            placeholder="Es. Doppia crema"
          />
        </div>
        <div className="min-w-[180px] flex-[2]">
          <Label htmlFor="addon-desc">Descrizione (opzionale)</Label>
          <Input
            id="addon-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
          />
        </div>
        <div className="w-32">
          <Label htmlFor="addon-price">Prezzo (€)</Label>
          <Input
            id="addon-price"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Es. 5.00"
          />
        </div>
        <Button type="button" disabled={createMutation.isPending} onClick={handleCreate}>
          <Plus className="mr-1 h-4 w-4" /> Aggiungi
        </Button>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <AddonOptionRow key={item.id} item={item} />
        ))}
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">Nessuna aggiunta. Aggiungine una.</p>
        )}
      </div>
    </div>
  );
}

function AddonOptionRow({ item }: { item: AddonOption }) {
  const qc = useQueryClient();
  const runUpdate = useServerFn(updateCakeAddon);
  const runDelete = useServerFn(deleteCakeAddon);
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? "");
  const [price, setPrice] = useState(String(item.price));
  const [active, setActive] = useState(item.active);

  const dirty =
    name.trim() !== item.name ||
    description !== (item.description ?? "") ||
    price !== String(item.price) ||
    active !== item.active;

  const updateMutation = useMutation({
    mutationFn: (v: { name: string; description: string | null; price: number; active: boolean }) =>
      runUpdate({ data: { id: item.id, ...v } }),
    onSuccess: () => {
      invalidateCakeOptions(qc);
      toast.success("Aggiornata");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Errore salvataggio"),
  });
  const deleteMutation = useMutation({
    mutationFn: () => runDelete({ data: { id: item.id } }),
    onSuccess: () => {
      invalidateCakeOptions(qc);
      toast.success("Eliminata");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Errore eliminazione"),
  });

  function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Il nome non può essere vuoto");
      return;
    }
    const parsedPrice = Number(price.replace(",", "."));
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      toast.error("Prezzo non valido");
      return;
    }
    updateMutation.mutate({
      name: trimmedName,
      description: description.trim() || null,
      price: parsedPrice,
      active,
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl bg-card p-3 ring-1 ring-border">
      <div className="min-w-[160px] flex-1">
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
      </div>
      <div className="min-w-[180px] flex-[2]">
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          placeholder="Descrizione"
        />
      </div>
      <div className="w-28">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={active} onCheckedChange={setActive} />
        <span className="text-xs text-muted-foreground">{active ? "Attiva" : "Nascosta"}</span>
      </div>
      <Button
        type="button"
        size="sm"
        disabled={!dirty || updateMutation.isPending}
        onClick={handleSave}
      >
        Salva
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" size="icon" variant="outline" disabled={deleteMutation.isPending}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare "{item.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Sparirà subito dal configuratore. L'operazione non è reversibile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()}>Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
