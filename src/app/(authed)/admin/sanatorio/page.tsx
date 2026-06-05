"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, Save, Upload, Trash2 } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import {
  useSanatorioConfig,
  getIniciales,
} from "@/lib/sanatorio-config-context";
import { toast } from "sonner";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ACCEPTED_LOGO_TYPES = ["image/png", "image/jpeg"];
const LOGO_BUCKET = "logos";

export default function SanatorioConfigPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const { config, refresh } = useSanatorioConfig();

  const [nombre, setNombre] = useState(config.nombre);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [savingNombre, setSavingNombre] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && user && user.rol !== "admin") {
      toast.error("Sin acceso");
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviewUrl(null);
    return undefined;
  }, [selectedFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      toast.error("Formato no soportado", {
        description: "Solo PNG o JPG",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSelectedFile(null);
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("Imagen demasiado grande", {
        description: "Máximo 2MB",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleUploadLogo = async () => {
    if (!selectedFile) {
      toast.error("Seleccioná una imagen primero");
      return;
    }
    if (!user) return;

    setUploadingLogo(true);
    try {
      const filePath = `logo.${selectedFile.type === "image/png" ? "png" : "jpg"}`;
      const { error: uploadError } = await supabase.storage
        .from(LOGO_BUCKET)
        .upload(filePath, selectedFile, {
          upsert: true,
          contentType: selectedFile.type,
        });
      if (uploadError) throw uploadError;

      const { data: pub } = supabase.storage
        .from(LOGO_BUCKET)
        .getPublicUrl(filePath);
      const publicUrl = pub.publicUrl;

      const update = {
        logo_url: publicUrl,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      };

      if (config.id) {
        const { error } = await supabase
          .from("config_sanatorio")
          .update(update)
          .eq("id", config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("config_sanatorio")
          .insert({
            nombre: nombre.trim() || "SalaQX",
            ...update,
          });
        if (error) throw error;
      }

      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await refresh();
      toast.success("Logo actualizado");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      toast.error("Error al subir logo", { description: msg });
    }
    setUploadingLogo(false);
  };

  const handleRemoveLogo = async () => {
    if (!user || !config.id) return;
    if (!confirm("¿Eliminar el logo? Quedarán las iniciales del nombre.")) {
      return;
    }
    setUploadingLogo(true);
    try {
      const { error } = await supabase
        .from("config_sanatorio")
        .update({
          logo_url: null,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", config.id);
      if (error) throw error;

      try {
        await supabase.storage.from(LOGO_BUCKET).remove(["logo.png", "logo.jpg"]);
      } catch {
        // ignore storage cleanup errors
      }

      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await refresh();
      toast.success("Logo eliminado");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      toast.error("Error al eliminar logo", { description: msg });
    }
    setUploadingLogo(false);
  };

  const handleSaveNombre = async () => {
    const trimmed = nombre.trim();
    if (!trimmed) {
      toast.error("El nombre no puede estar vacío");
      return;
    }
    if (!user) return;
    setSavingNombre(true);
    try {
      const update = {
        nombre: trimmed,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      };
      if (config.id) {
        const { error } = await supabase
          .from("config_sanatorio")
          .update(update)
          .eq("id", config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("config_sanatorio")
          .insert({ ...update, logo_url: null });
        if (error) throw error;
      }
      await refresh();
      toast.success("Nombre actualizado");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      toast.error("Error al guardar nombre", { description: msg });
    }
    setSavingNombre(false);
  };

  if (authLoading || !user) {
    return <LoadingState label="Cargando..." />;
  }

  if (user.rol !== "admin") {
    return (
      <Alert variant="destructive">
        <AlertDescription>No tenés acceso a esta sección</AlertDescription>
      </Alert>
    );
  }

  const currentLogo = previewUrl ?? config.logo_url;

  return (
    <div className="space-y-8">
      <PageHeader
        icon={Building2}
        title="Configuración del Sanatorio"
        description="Personalizá el nombre y el logo que se muestran en toda la app y en los emails"
      />

      <Card>
        <CardHeader>
          <CardTitle>Nombre del Sanatorio</CardTitle>
          <CardDescription>
            Aparecerá en la barra lateral, la pantalla de login, el título del navegador y todos los emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sanatorio-nombre">Nombre</Label>
            <Input
              id="sanatorio-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Mi Sanatorio"
              maxLength={80}
            />
          </div>
          <Button
            onClick={handleSaveNombre}
            disabled={savingNombre || nombre.trim() === config.nombre}
          >
            <Save size={16} className="mr-2" />
            {savingNombre ? "Guardando..." : "Guardar nombre"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
          <CardDescription>
            PNG o JPG, máximo 2MB. Reemplaza al logo anterior.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
              {currentLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentLogo}
                  alt="Logo del sanatorio"
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-lg font-bold text-[#1B4F72]">
                  {getIniciales(nombre || config.nombre)}
                </span>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleUploadLogo}
                  disabled={uploadingLogo || !selectedFile}
                >
                  <Upload size={16} className="mr-2" />
                  {uploadingLogo ? "Subiendo..." : "Subir logo"}
                </Button>
                {config.logo_url && !previewUrl && (
                  <Button
                    variant="outline"
                    onClick={handleRemoveLogo}
                    disabled={uploadingLogo}
                  >
                    <Trash2 size={16} className="mr-2" />
                    Eliminar logo
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
