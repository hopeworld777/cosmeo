import { useState } from "react";
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
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isForSale, setIsForSale] = useState(true);
  const [isForRent, setIsForRent] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      category: "",
      condition: "",
    }
  });

  const onSubmit = (data) => {
    if (!isForSale && !isForRent) {
      toast({ title: "Error", description: "Must select either Rent or Sell", variant: "destructive" });
      return;
    }
    console.log({ ...data, isForSale, isForRent });
    setIsSuccess(true);
    setTimeout(() => {
      setLocation("/profile");
    }, 2000);
  };

  if (isSuccess) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-black">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
          <div className="rounded-full bg-primary/20 p-4 mb-4">
            <CheckCircle2 className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Listed Successfully!</h1>
          <p className="text-muted-foreground">Your item is now live in the marketplace.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black">
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border/50 pt-12 pb-4 px-4">
        <h1 className="text-2xl font-bold">List an Item</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 no-scrollbar">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Photo Upload */}
          <div className="space-y-2">
            <Label>Photos</Label>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              <div className="flex h-28 w-28 shrink-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card hover:border-primary transition-colors text-muted-foreground hover:text-primary">
                <Camera className="h-8 w-8" />
                <span className="text-xs font-medium">Add Photo</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 bg-card p-5 rounded-2xl border border-border/50">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" placeholder="e.g. Master Sword Replica" className="bg-background border-border" {...register("title")} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="fandom">Fandom / Series</Label>
              <Input id="fandom" placeholder="e.g. Zelda" className="bg-background border-border" {...register("fandom")} />
              {errors.fandom && <p className="text-xs text-destructive">{errors.fandom.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select onValueChange={(val) => setValue("category", val)}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="costume">Costume</SelectItem>
                    <SelectItem value="prop">Prop</SelectItem>
                    <SelectItem value="wig">Wig</SelectItem>
                    <SelectItem value="armor">Armor</SelectItem>
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Condition</Label>
                <Select onValueChange={(val) => setValue("condition", val)}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Brand New</SelectItem>
                    <SelectItem value="like-new">Like New</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                  </SelectContent>
                </Select>
                {errors.condition && <p className="text-xs text-destructive">{errors.condition.message}</p>}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="size">Size</Label>
              <Input id="size" placeholder="e.g. Mens M, Adjustable, etc." className="bg-background border-border" {...register("size")} />
              {errors.size && <p className="text-xs text-destructive">{errors.size.message}</p>}
            </div>
          </div>

          <div className="space-y-4 bg-card p-5 rounded-2xl border border-border/50">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">List for Sale</Label>
                <p className="text-xs text-muted-foreground">Sell this item permanently.</p>
              </div>
              <Switch checked={isForSale} onCheckedChange={setIsForSale} />
            </div>
            
            {isForSale && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="pt-2">
                <Input type="number" placeholder="Sale Price ($)" className="bg-background border-border" {...register("price")} />
              </motion.div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <div className="space-y-0.5">
                <Label className="text-base text-secondary">List for Rent</Label>
                <p className="text-xs text-muted-foreground">Lend it out for daily rates.</p>
              </div>
              <Switch checked={isForRent} onCheckedChange={setIsForRent} />
            </div>
            
            {isForRent && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="pt-2">
                <Input type="number" placeholder="Daily Rental Rate ($)" className="bg-background border-border" {...register("rentPrice")} />
              </motion.div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea 
              id="description" 
              className="flex min-h-[120px] w-full rounded-xl border border-input bg-card px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Tell buyers about the fit, materials, flaws, and history..."
              {...register("description")}
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <Button type="submit" className="w-full h-14 rounded-xl text-lg font-bold shadow-lg" data-testid="btn-submit-listing">
            Publish Listing
          </Button>
        </form>
      </div>
    </div>
  );
}
