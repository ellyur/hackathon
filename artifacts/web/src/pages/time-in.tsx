import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, ScanFace, Map as MapIcon, Fingerprint, CheckCircle2, AlertCircle } from 'lucide-react';
import { useState } from 'react';

export function TimeInSimulatorPage() {
  const [step, setStep] = useState(0); // 0 = start, 1 = gps, 2 = face, 3 = success

  const runSimulation = () => {
    setStep(1);
    setTimeout(() => {
      setStep(2);
      setTimeout(() => {
        setStep(3);
      }, 1500);
    }, 1500);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Active Duty</h2>
          <p className="text-muted-foreground mt-1">Biometric and geofence verification</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2 overflow-hidden">
          <div className="h-2 bg-primary"></div>
          <CardHeader>
            <CardTitle>St. Luke's Medical Center - ICU</CardTitle>
            <CardDescription>Today, 08:00 AM - 04:00 PM</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-6">
               <div className="flex-1 space-y-4">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                     <Avatar className="w-8 h-8">
                       <AvatarFallback>CI</AvatarFallback>
                     </Avatar>
                   </div>
                   <div>
                     <div className="text-sm font-medium">Dr. James Wilson</div>
                     <div className="text-xs text-muted-foreground">Clinical Instructor</div>
                   </div>
                 </div>
                 
                 <div className="pt-4 border-t space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Required Hours:</span>
                      <span className="font-medium">8.0 hrs</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Grace Period:</span>
                      <span className="font-medium text-amber-600">Until 08:15 AM</span>
                    </div>
                 </div>
               </div>

               <div className="flex-1 bg-muted/30 rounded-xl p-6 border flex flex-col items-center justify-center text-center space-y-4">
                 {step === 0 && (
                   <>
                     <Fingerprint className="w-12 h-12 text-primary opacity-80" />
                     <div>
                       <h3 className="font-semibold text-lg">Ready to Time In</h3>
                       <p className="text-sm text-muted-foreground mt-1">Make sure you are at the hospital premises.</p>
                     </div>
                     <Button size="lg" className="w-full mt-2" onClick={runSimulation}>Start Verification</Button>
                   </>
                 )}
                 {step === 1 && (
                   <>
                     <MapIcon className="w-12 h-12 text-primary animate-pulse" />
                     <div>
                       <h3 className="font-semibold text-lg">Verifying Location</h3>
                       <p className="text-sm text-muted-foreground mt-1">Checking GPS coordinates against geofence...</p>
                     </div>
                   </>
                 )}
                 {step === 2 && (
                   <>
                     <ScanFace className="w-12 h-12 text-primary animate-pulse" />
                     <div>
                       <h3 className="font-semibold text-lg">Face Scan</h3>
                       <p className="text-sm text-muted-foreground mt-1">Analyzing liveness and identity...</p>
                     </div>
                   </>
                 )}
                 {step === 3 && (
                   <>
                     <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                       <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                     </div>
                     <div>
                       <h3 className="font-semibold text-lg text-emerald-700">Verified & Timed In</h3>
                       <p className="text-sm text-muted-foreground mt-1">08:04 AM • You are Present</p>
                     </div>
                     <div className="flex gap-2 w-full text-xs text-left bg-background p-3 rounded border">
                        <div className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3 h-3"/> Location Match</div>
                        <div className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3 h-3"/> Face Match</div>
                     </div>
                   </>
                 )}
               </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
