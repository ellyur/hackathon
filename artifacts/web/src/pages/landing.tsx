import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Activity, ClipboardCheck, ShieldCheck, MapPin } from 'lucide-react';
import { Link } from 'wouter';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="fixed top-0 inset-x-0 h-16 bg-background/80 backdrop-blur-md border-b z-50">
        <div className="container mx-auto h-full flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2.5">
            <img src="/sipag-logo.png" alt="SIPAG" className="w-9 h-9 rounded-lg object-contain bg-white shadow-sm" />
            <div>
              <div className="font-bold text-xl tracking-wide leading-none" style={{ color: 'hsl(217 67% 27%)' }}>SIPAG</div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-medium leading-none mt-0.5 hidden sm:block">Smart Integrated Platform</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">Sign In</Link>
            <Button asChild className="rounded-full px-6">
              <Link href="/login">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-32 px-4 md:px-6">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge className="mb-6 mx-auto bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
            Precision Grade Rotation Management
          </Badge>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground mb-6 leading-tight">
            The control center for <span className="text-primary">clinical education.</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            A professional platform where schedulers, clinical instructors, and students manage rotations, track cases, and verify attendance with hospital-grade precision.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="rounded-full text-base px-8 h-14 w-full sm:w-auto shadow-xl" asChild>
              <Link href="/login">Explore the Platform <ArrowRight className="ml-2 w-5 h-5" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-full text-base px-8 h-14 w-full sm:w-auto" asChild>
              <Link href="#features">See Features</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Hero Image Mockup */}
      <section className="px-4 md:px-6 pb-20">
        <div className="container mx-auto">
          <div className="relative rounded-2xl md:rounded-[2rem] border bg-card shadow-2xl overflow-hidden aspect-video max-h-[600px] w-full max-w-6xl mx-auto flex flex-col">
            <div className="h-12 bg-muted/50 border-b flex items-center px-4 gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-destructive/80"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
              </div>
            </div>
            <div className="flex-1 bg-background/50 p-8 flex items-center justify-center">
               <div className="text-center text-muted-foreground/50 font-medium text-lg">
                  Dashboard Interface Visual
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-muted/30 px-4 md:px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to run clinicals.</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Purpose-built tools for every role in your program.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="bg-background border-none shadow-md">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <ClipboardCheck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">Clinical Passport</h3>
                <p className="text-muted-foreground">Digital tracking of required cases and procedures with CI verification workflows.</p>
              </CardContent>
            </Card>

            <Card className="bg-background border-none shadow-md">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <MapPin className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">Smart Attendance</h3>
                <p className="text-muted-foreground">Geofenced Time In/Out and liveness verification ensures students are exactly where they need to be.</p>
              </CardContent>
            </Card>

            <Card className="bg-background border-none shadow-md">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <Activity className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">Automated Makeup</h3>
                <p className="text-muted-foreground">Instantly flag absences and match students to available open slots to complete required hours.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-24 px-4 md:px-6">
        <div className="container mx-auto max-w-6xl">
           <div className="flex flex-col lg:flex-row items-center gap-12">
              <div className="flex-1 space-y-8">
                <h2 className="text-3xl md:text-4xl font-bold leading-tight">One platform.<br/>Four dedicated experiences.</h2>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 mt-1 font-bold">1</div>
                    <div>
                      <h4 className="text-xl font-semibold">Students</h4>
                      <p className="text-muted-foreground">Track hours, log cases, and apply for open duty slots from a mobile-optimized dashboard.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 mt-1 font-bold">2</div>
                    <div>
                      <h4 className="text-xl font-semibold">Clinical Instructors</h4>
                      <p className="text-muted-foreground">Manage live rosters, verify student locations, and approve case submissions on the floor.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 mt-1 font-bold">3</div>
                    <div>
                      <h4 className="text-xl font-semibold">Schedulers</h4>
                      <p className="text-muted-foreground">Build master schedules, manage case gaps, and automate recommendations for slot assignments.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1 w-full relative">
                <div className="aspect-square bg-gradient-to-br from-primary/20 to-accent rounded-full absolute inset-0 blur-3xl opacity-50"></div>
                <div className="relative border bg-card rounded-2xl shadow-xl p-8 space-y-4">
                   <div className="h-10 w-3/4 bg-muted rounded"></div>
                   <div className="h-4 w-1/2 bg-muted/60 rounded"></div>
                   <div className="grid grid-cols-2 gap-4 mt-8">
                     <div className="h-24 bg-muted/40 rounded-xl"></div>
                     <div className="h-24 bg-muted/40 rounded-xl"></div>
                     <div className="h-24 bg-muted/40 rounded-xl col-span-2"></div>
                   </div>
                </div>
              </div>
           </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 md:px-6 bg-primary text-primary-foreground">
        <div className="container mx-auto text-center max-w-3xl">
          <ShieldCheck className="w-16 h-16 mx-auto mb-6 opacity-80" />
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to upgrade your clinical rotations?</h2>
          <p className="text-primary-foreground/80 text-lg mb-10">
            Join the programs already using SIPAG to ensure compliance and streamline their schedules.
          </p>
          <Button size="lg" variant="secondary" className="rounded-full text-base px-10 h-14" asChild>
            <Link href="/login">Launch Platform</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
