import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Image as ImageIcon, Video, Link as LinkIcon, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  /** Called with an HTML snippet (img or video) ready to inject in an email template. */
  onInsert: (html: string) => void;
}

/**
 * Email media inserter — image OR video, via URL or direct upload.
 * Videos are uploaded to Supabase storage with auto-poster preview.
 */
export const EmailMediaInserter = ({ onInsert }: Props) => {
  const { toast } = useToast();
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const buildImageHtml = (url: string) =>
    `<div style="text-align:center;margin:24px 0;"><img src="${url}" alt="" style="max-width:100%;height:auto;border-radius:12px;display:inline-block;" /></div>`;

  const buildVideoHtml = (url: string, poster?: string) =>
    `<div style="text-align:center;margin:24px 0;"><a href="${url}" style="display:inline-block;position:relative;text-decoration:none;">` +
    (poster ? `<img src="${poster}" alt="Voir la vidéo" style="max-width:100%;border-radius:12px;display:block;" />` : `<div style="background:#0c2340;color:#fff;padding:48px 32px;border-radius:12px;font-weight:700;font-size:16px;">▶︎ Lire la vidéo</div>`) +
    `</a><p style="margin:10px 0 0;font-size:13px;color:#64748b;">Cliquez pour lire la vidéo</p></div>`;

  const upload = async (file: File, kind: "image" | "video") => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || (kind === "image" ? "jpg" : "mp4");
      const path = `email-media/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
      const { error } = await supabase.storage.from("public-uploads").upload(path, file, {
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("public-uploads").getPublicUrl(path);
      const url = data.publicUrl;
      const html = kind === "image" ? buildImageHtml(url) : buildVideoHtml(url);
      onInsert(html);
      toast({ title: "Média inséré", description: `${kind === "image" ? "Image" : "Vidéo"} ajoutée au template.` });
    } catch (e: any) {
      toast({ title: "Upload impossible", description: e.message ?? String(e), variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ImageIcon className="h-4 w-4" /> Insérer image ou vidéo
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Collez une URL ou uploadez un fichier. Le bloc HTML responsive est ajouté à la fin du template.
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="image">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="image"><ImageIcon className="h-4 w-4 mr-2" />Image</TabsTrigger>
            <TabsTrigger value="video"><Video className="h-4 w-4 mr-2" />Vidéo</TabsTrigger>
          </TabsList>

          <TabsContent value="image" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs"><LinkIcon className="h-3.5 w-3.5" /> URL de l'image</Label>
              <div className="flex gap-2">
                <Input placeholder="https://…" value={imageUrl} onChange={e=>setImageUrl(e.target.value)} />
                <Button disabled={!imageUrl.trim()} onClick={()=>{ onInsert(buildImageHtml(imageUrl.trim())); setImageUrl(""); toast({title:"Image insérée"});}}>Insérer</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs"><Upload className="h-3.5 w-3.5" /> Ou uploader</Label>
              <Input ref={fileRef} type="file" accept="image/*" disabled={uploading}
                onChange={e => e.target.files?.[0] && upload(e.target.files[0], "image")} />
              {uploading && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Upload…</p>}
            </div>
          </TabsContent>

          <TabsContent value="video" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs"><LinkIcon className="h-3.5 w-3.5" /> URL de la vidéo (YouTube, MP4…)</Label>
              <div className="flex gap-2">
                <Input placeholder="https://…" value={videoUrl} onChange={e=>setVideoUrl(e.target.value)} />
                <Button disabled={!videoUrl.trim()} onClick={()=>{ onInsert(buildVideoHtml(videoUrl.trim())); setVideoUrl(""); toast({title:"Vidéo insérée"});}}>Insérer</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs"><Upload className="h-3.5 w-3.5" /> Ou uploader une vidéo</Label>
              <Input type="file" accept="video/*" disabled={uploading}
                onChange={e => e.target.files?.[0] && upload(e.target.files[0], "video")} />
              <p className="text-xs text-muted-foreground">L'upload est optimisé via Supabase Storage — les emails embarquent une vignette cliquable (les clients mail ne lisent pas les vidéos en direct).</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
