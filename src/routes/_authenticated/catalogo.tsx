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
