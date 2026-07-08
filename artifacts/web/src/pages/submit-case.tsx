import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, FileUp } from 'lucide-react';

export function SubmitCasePage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Submit Case Verification</h2>
        <p className="text-muted-foreground mt-1">Log a completed clinical procedure for CI review.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Case Details</CardTitle>
          <CardDescription>All submissions require CI approval to count towards your passport.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
             <div className="space-y-2 col-span-2">
                <Label>Case Type / Procedure</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select procedure..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nsd">Normal Spontaneous Delivery</SelectItem>
                    <SelectItem value="iv">IV Insertion</SelectItem>
                    <SelectItem value="foley">Foley Catheter</SelectItem>
                    <SelectItem value="cpr">CPR</SelectItem>
                  </SelectContent>
                </Select>
             </div>
             
             <div className="space-y-2">
                <Label>Hospital</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select hospital..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="h1">St. Luke's Medical Center</SelectItem>
                    <SelectItem value="h2">General Hospital</SelectItem>
                  </SelectContent>
                </Select>
             </div>

             <div className="space-y-2">
                <Label>Department</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select dept..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="icu">ICU</SelectItem>
                    <SelectItem value="er">ER</SelectItem>
                    <SelectItem value="dr">Delivery Room</SelectItem>
                  </SelectContent>
                </Select>
             </div>

             <div className="space-y-2 col-span-2">
                <Label>Clinical Instructor</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select CI for verification..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ci1">Dr. James Wilson</SelectItem>
                    <SelectItem value="ci2">Dr. Sarah Smith</SelectItem>
                  </SelectContent>
                </Select>
             </div>

             <div className="space-y-2 col-span-2">
               <Label>Notes / Patient Initials (Optional)</Label>
               <Textarea placeholder="Brief description of the case, complications, etc. Do not include PHI." />
             </div>

             <div className="space-y-2 col-span-2">
               <Label>Evidence / Photo (Optional)</Label>
               <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer">
                  <Camera className="w-8 h-8 mb-2" />
                  <span className="font-medium text-sm">Click to upload photo</span>
                  <span className="text-xs">Supported: JPG, PNG, PDF</span>
               </div>
             </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3 border-t bg-muted/20 p-6">
          <Button variant="ghost">Cancel</Button>
          <Button className="gap-2">
            <FileUp className="w-4 h-4" />
            Submit for Review
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
