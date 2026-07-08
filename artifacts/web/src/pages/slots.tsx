import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar as CalendarIcon, Clock, Users, PlusCircle, Loader2 } from 'lucide-react';
import { useListSlots, useApplyForSlot } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export function AvailableSlotsPage() {
  const { toast } = useToast();
  const [applying, setApplying] = useState<string | null>(null);

  const { data: slots = [], isLoading } = useListSlots({ status: 'open' });
  const applyForSlot = useApplyForSlot();

  async function handleApply(slotId: string) {
    setApplying(slotId);
    try {
      await applyForSlot.mutateAsync({ id: slotId });
      toast({ title: 'Application Submitted', description: 'Your application has been sent for review.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to apply';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setApplying(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Available Duty Slots</h2>
          <p className="text-muted-foreground mt-1">Browse and apply for upcoming clinical rotations.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : slots.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          No open slots available at this time.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {slots.map((slot) => {
            const spotsLeft = slot.maxStudents - (slot.approvedCount ?? 0);
            const isFull = spotsLeft <= 0;

            return (
              <Card key={slot.id} className="flex flex-col relative overflow-hidden group">
                {slot.isMakeup && (
                  <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg z-10">
                    MAKEUP ELIGIBLE
                  </div>
                )}
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                      {slot.department?.name ?? slot.departmentId}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl leading-tight">
                    {slot.hospital?.name ?? slot.hospitalId}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {slot.dutyDate}
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Clock className="w-4 h-4 mr-2" />
                      {slot.startTime} – {slot.endTime}
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Users className="w-4 h-4 mr-2" />
                      {isFull ? 'Full' : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left (of ${slot.maxStudents})`}
                    </div>
                    {slot.description && (
                      <div className="flex items-start text-muted-foreground">
                        <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-xs">{slot.description}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <div className="p-6 pt-0 mt-auto">
                  <Button
                    className="w-full shadow-sm"
                    variant={slot.isMakeup ? 'default' : 'secondary'}
                    disabled={isFull || applying === slot.id || applyForSlot.isPending}
                    onClick={() => handleApply(slot.id)}
                  >
                    {applying === slot.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <PlusCircle className="w-4 h-4 mr-2" />
                    )}
                    {isFull ? 'Slot Full' : 'Apply for Slot'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
