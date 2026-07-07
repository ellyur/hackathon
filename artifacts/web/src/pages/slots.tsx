import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar as CalendarIcon, Clock, Users, PlusCircle } from 'lucide-react';

export function AvailableSlotsPage() {
  const slots = [
    {
      id: '1',
      hosp: 'St. Luke\'s Medical Center',
      dept: 'Intensive Care Unit (ICU)',
      date: 'Tomorrow, Oct 16',
      time: '08:00 AM - 04:00 PM',
      isMakeup: true,
      openings: 2,
      total: 5,
    },
    {
      id: '2',
      hosp: 'General Hospital',
      dept: 'Emergency Room (ER)',
      date: 'Friday, Oct 18',
      time: '04:00 PM - 12:00 MN',
      isMakeup: false,
      openings: 1,
      total: 6,
    },
    {
      id: '3',
      hosp: 'Medical City',
      dept: 'Pediatrics Ward',
      date: 'Monday, Oct 21',
      time: '08:00 AM - 04:00 PM',
      isMakeup: false,
      openings: 3,
      total: 8,
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Available Duty Slots</h2>
          <p className="text-muted-foreground mt-1">Browse and apply for upcoming clinical rotations.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Filter by Hospital</Button>
          <Button variant="outline">Date Range</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {slots.map((slot) => (
          <Card key={slot.id} className="flex flex-col relative overflow-hidden group">
            {slot.isMakeup && (
              <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg z-10">
                MAKEUP ELIGIBLE
              </div>
            )}
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start mb-2">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                  {slot.dept}
                </Badge>
              </div>
              <CardTitle className="text-xl leading-tight">{slot.hosp}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center text-muted-foreground">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {slot.date}
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Clock className="w-4 h-4 mr-2" />
                  {slot.time}
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Users className="w-4 h-4 mr-2" />
                  {slot.openings} spots left (out of {slot.total})
                </div>
              </div>
            </CardContent>
            <div className="p-6 pt-0 mt-auto">
              <Button className="w-full shadow-sm" variant={slot.isMakeup ? "default" : "secondary"}>
                <PlusCircle className="w-4 h-4 mr-2" />
                Apply for Slot
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
