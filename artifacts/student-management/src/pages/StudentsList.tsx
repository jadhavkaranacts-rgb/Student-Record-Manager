import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  useListStudents, 
  useDeleteStudent, 
  getListStudentsQueryKey,
  Gender
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Search, Plus, MoreHorizontal, Pencil, Trash2, 
  ChevronLeft, ChevronRight, Filter, X
} from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, 
  SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, 
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, 
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDebounce } from "@/hooks/use-debounce";
import { getPhotoSrc } from "@/lib/utils";

export default function StudentsList() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");

  const [studentToDelete, setStudentToDelete] = useState<{id: number, name: string} | null>(null);

  // Queries & Mutations
  const { data, isLoading } = useListStudents({
    page,
    pageSize: 10,
    search: debouncedSearch || undefined,
    course: courseFilter !== "all" ? courseFilter : undefined,
    year: yearFilter !== "all" ? parseInt(yearFilter) : undefined,
    gender: genderFilter !== "all" ? genderFilter as Gender : undefined,
    sortBy: "createdAt",
    sortOrder: "desc"
  });

  const deleteMutation = useDeleteStudent({
    mutation: {
      onSuccess: () => {
        toast({ title: "Student deleted", description: "The student record has been removed." });
        queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        setStudentToDelete(null);
      },
      onError: (err) => {
        toast({ 
          title: "Error deleting student", 
          description: err.data?.error || "An unexpected error occurred.",
          variant: "destructive" 
        });
      }
    }
  });

  // Derived state
  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;
  const hasActiveFilters = courseFilter !== "all" || yearFilter !== "all" || genderFilter !== "all";

  const clearFilters = () => {
    setCourseFilter("all");
    setYearFilter("all");
    setGenderFilter("all");
    setSearchTerm("");
    setPage(1);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Students</h1>
          <p className="text-muted-foreground mt-1">Manage enrolled student records and information.</p>
        </div>
        <Button asChild size="lg" className="hover-elevate-2 shadow-sm font-medium">
          <Link href="/students/new">
            <Plus className="w-5 h-5 mr-2" />
            Add Student
          </Link>
        </Button>
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Filters Bar */}
        <div className="p-4 border-b bg-muted/20 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name, email, or admission number..." 
                className="pl-9 bg-background"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            
            <div className="flex gap-2 flex-wrap md:flex-nowrap">
              <Select value={courseFilter} onValueChange={(v) => { setCourseFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[140px] bg-background">
                  <SelectValue placeholder="Course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {/* Ideally these would be dynamic, hardcoding common ones for demo */}
                  <SelectItem value="Computer Science">Computer Science</SelectItem>
                  <SelectItem value="Engineering">Engineering</SelectItem>
                  <SelectItem value="Business">Business</SelectItem>
                  <SelectItem value="Arts">Arts</SelectItem>
                </SelectContent>
              </Select>

              <Select value={yearFilter} onValueChange={(v) => { setYearFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[120px] bg-background">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {[1, 2, 3, 4, 5, 6].map(y => (
                    <SelectItem key={y} value={y.toString()}>Year {y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={genderFilter} onValueChange={(v) => { setGenderFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[120px] bg-background">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value={Gender.Male}>Male</SelectItem>
                  <SelectItem value={Gender.Female}>Female</SelectItem>
                  <SelectItem value={Gender.Other}>Other</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" className="px-3" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[300px]">Student</TableHead>
                <TableHead>Admission No.</TableHead>
                <TableHead>Course & Year</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Enrolled</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-full max-w-[200px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : data?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-[400px] text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                        <Filter className="w-6 h-6" />
                      </div>
                      <h3 className="font-medium text-foreground">No students found</h3>
                      <p className="text-sm mt-1">Try adjusting your search or filters.</p>
                      {(hasActiveFilters || searchTerm) && (
                        <Button variant="outline" className="mt-4" onClick={clearFilters}>
                          Clear all filters
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data?.data.map((student) => (
                  <TableRow key={student.id} className="group transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 border shadow-sm">
                          {student.photoUrl ? (
                            <AvatarImage src={getPhotoSrc(student.photoUrl)} alt={student.name} className="object-cover" />
                          ) : null}
                          <AvatarFallback className="bg-primary/10 text-primary font-medium">
                            {student.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <Link href={`/students/${student.id}`} className="font-medium text-foreground hover:text-primary transition-colors hover:underline">
                            {student.name}
                          </Link>
                          <div className="text-xs text-muted-foreground mt-0.5">{student.gender}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono bg-background text-muted-foreground">
                        {student.admissionNumber}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{student.course}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Year {student.year}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{student.email}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{student.mobileNumber}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(student.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 data-[state=open]:opacity-100">
                            <MoreHorizontal className="w-4 h-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setLocation(`/students/${student.id}`)}>
                            <Pencil className="w-4 h-4 mr-2" /> Edit Record
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            onClick={() => setStudentToDelete({ id: student.id, name: student.name })}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Drop Student
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {data && data.total > 0 && (
          <div className="p-4 border-t flex items-center justify-between bg-card text-sm">
            <div className="text-muted-foreground">
              Showing <span className="font-medium text-foreground">{(page - 1) * data.pageSize + 1}</span> to <span className="font-medium text-foreground">{Math.min(page * data.pageSize, data.total)}</span> of <span className="font-medium text-foreground">{data.total}</span> students
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => p + 1)}
                disabled={page >= totalPages || isLoading}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!studentToDelete} onOpenChange={(open) => !open && setStudentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the record for <strong className="text-foreground">{studentToDelete?.name}</strong>. 
              This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                if (studentToDelete) {
                  deleteMutation.mutate({ id: studentToDelete.id });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Dropping..." : "Drop Student"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
