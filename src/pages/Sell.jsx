import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Camera, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

const schema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Add more details for buyers"),
  price: z.string().optional(),
  rentPrice: z.string().optional(),
  fandom: z.string().min(2, "Fandom is required"),
  category: z.string().min(1, "Select a category"),
  condition: z.string().min(1, "Select condition"),
  size: z.string().min(1, "Size is required"),
});

export default function Sell() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isForSale, setIsForSale] = useState(true);
  const [isForRent, setIsForRent] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [uploadedImages, setUploadedImages] = useState([]);
  const fileInputRef = useRef(null);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      category: "",
      condition: "",
    }
  });

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    try {
      setLoading(true);
      const { urls } = await api.upload.multiple(files);
      setUploadedImages(prev => [...prev, ...urls]);
    } catch (err) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    if (!isForSale && !isForRent) {
      toast({ title: "Error", description: "Must select either Rent or Sell", variant: "destructive" });
      return;
    }
    
    setLoading(true);
    try {
      await api.listings.create({
        ...data,
        rent_price: data.rentPrice,
        is_for_sale: isForSale,
        is_for_rent: isForRent,
        images: uploadedImages,
      });
      setIsSuccess(true);
      setTimeout(() => {
        setLocation("/profile");
      }, 2000);
    } catch (err) {
      toast({ title: "Listing failed", description: err.message, variant: "destructive" });
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-background pastel-gradient">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center bg-white p-10 rounded-[3rem] card-shadow">
          <div className="rounded-full bg-primary/10 p-6 mb-6">
            <CheckCircle2 className="h-20 w-20 text-primary" />
          </div>
          <h1 className="text-3xl font-black text-foreground mb-3">Listed Successfully!</h1>
          <p className="text-muted-foreground font-medium text-lg">Your item is now live in the marketplace.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl pt-12 pb-4 px-4 rounded-b-3xl" style={{ boxShadow: "0 4px 20px rgba(139,92,246,0.05)" }}>
        <h1 className="text-3xl font-black text-foreground">List an Item</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 pt-6 no-scrollbar">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Photo Upload */}
          <div className="space-y-3">
            <Label className="font-extrabold text-foreground ml-1">Photos</Label>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileSelect}
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="flex h-32 w-32 shrink-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors text-primary"
              >
                <Camera className="h-8 w-8" />
                <span className="text-sm font-bold">Add Photo</span>
              </div>
              {uploadedImages.map((url, i) => (
                <div key={i} className="h-32 w-32 shrink-0 rounded-3xl overflow-hidden bg-muted">
                  <img src={url} alt="upload" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-5 bg-white p-6 rounded-3xl card-shadow border-none">
            <div className="space-y-2">
              <Label htmlFor="title" className="font-bold text-foreground">Title</Label>
              <Input id="title" placeholder="e.g. Master Sword Replica" className="bg-muted border-none h-12 rounded-2xl font-medium" {...register("title")} />
              {errors.title && <p className="text-xs text-destructive font-bold">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="fandom" className="font-bold text-foreground">Fandom / Series</Label>
              <Input id="fandom" placeholder="e.g. Zelda" className="bg-muted border-none h-12 rounded-2xl font-medium" {...register("fandom")} />
              {errors.fandom && <p className="text-xs text-destructive font-bold">{errors.fandom.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold text-foreground">Category</Label>
                <Select onValueChange={(val) => setValue("category", val)}>
                  <SelectTrigger className="bg-muted border-none h-12 rounded-2xl font-medium">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none card-shadow">
                    <SelectItem value="costume" className="rounded-xl font-bold">Costume</SelectItem>
                    <SelectItem value="prop" className="rounded-xl font-bold">Prop</SelectItem>
                    <SelectItem value="wig" className="rounded-xl font-bold">Wig</SelectItem>
                    <SelectItem value="armor" className="rounded-xl font-bold">Armor</SelectItem>
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-xs text-destructive font-bold">{errors.category.message}</p>}
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-foreground">Condition</Label>
                <Select onValueChange={(val) => setValue("condition", val)}>
                  <SelectTrigger className="bg-muted border-none h-12 rounded-2xl font-medium">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none card-shadow">
                    <SelectItem value="new" className="rounded-xl font-bold">Brand New</SelectItem>
                    <SelectItem value="like-new" className="rounded-xl font-bold">Like New</SelectItem>
                    <SelectItem value="good" className="rounded-xl font-bold">Good</SelectItem>
                    <SelectItem value="fair" className="rounded-xl font-bold">Fair</SelectItem>
                  </SelectContent>
                </Select>
                {errors.condition && <p className="text-xs text-destructive font-bold">{errors.condition.message}</p>}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="size" className="font-bold text-foreground">Size</Label>
              <Input id="size" placeholder="e.g. Mens M, Adjustable" className="bg-muted border-none h-12 rounded-2xl font-medium" {...register("size")} />
              {errors.size && <p className="text-xs text-destructive font-bold">{errors.size.message}</p>}
            </div>
          </div>

          <div className="space-y-5 bg-white p-6 rounded-3xl card-shadow border-none">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-lg font-black text-foreground">List for Sale</Label>
                <p className="text-sm font-medium text-muted-foreground">Sell this item permanently.</p>
              </div>
              <Switch checked={isForSale} onCheckedChange={setIsForSale} />
            </div>
            
            {isForSale && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="pt-1">
                <Input type="number" placeholder="Sale Price ($)" className="bg-muted border-none h-14 rounded-2xl text-lg font-bold" {...register("price")} />
              </motion.div>
            )}

            <div className="flex items-center justify-between pt-5 border-t border-border">
              <div className="space-y-1">
                <Label className="text-lg font-black text-secondary">List for Rent</Label>
                <p className="text-sm font-medium text-muted-foreground">Lend it out for daily rates.</p>
              </div>
              <Switch checked={isForRent} onCheckedChange={setIsForRent} />
            </div>
            
            {isForRent && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="pt-1">
                <Input type="number" placeholder="Daily Rental Rate ($)" className="bg-muted border-none h-14 rounded-2xl text-lg font-bold" {...register("rentPrice")} />
              </motion.div>
            )}
          </div>

          <div className="space-y-2 bg-white p-6 rounded-3xl card-shadow border-none">
            <Label htmlFor="description" className="font-bold text-foreground">Description</Label>
            <textarea 
              id="description" 
              className="flex min-h-[140px] w-full rounded-2xl border-none bg-muted px-4 py-3 text-base font-medium ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Tell buyers about the fit, materials, flaws, and history..."
              {...register("description")}
            />
            {errors.description && <p className="text-xs text-destructive font-bold">{errors.description.message}</p>}
          </div>

          <Button type="submit" disabled={loading} className="w-full h-16 rounded-2xl text-xl font-black text-white bg-gradient-to-r from-primary to-secondary shadow-[0_8px_24px_rgba(139,92,246,0.3)] hover:opacity-90 transition-opacity" data-testid="btn-submit-listing">
            {loading ? "Publishing..." : "Publish Listing"}
          </Button>
        </form>
      </div>
    </div>
  );
}
