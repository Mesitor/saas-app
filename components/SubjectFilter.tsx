"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { subjects } from "@/constants";
import { formUrlQuery, removeKeysFromUrlQuery } from "@jsmastery/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const SubjectFilter = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("subject") || "";

  const [searchSubject, setSearchSubject] = useState(query);

  useEffect(() => {
    if (searchSubject !== "all") {
      const newUrl = formUrlQuery({
        params: searchParams.toString(),
        key: "subject",
        value: searchSubject,
      });

      router.push(newUrl, { scroll: false });
    } else {
      if (searchSubject === "all") {
        const newUrl = removeKeysFromUrlQuery({
          params: searchParams.toString(),
          keysToRemove: ["subject"],
        });

        router.push(newUrl, { scroll: false });
      }
    }
  }, [searchSubject]);

  return (
    <Select onValueChange={setSearchSubject} value={searchSubject}>
      <SelectTrigger className="relative border border-black rounded-lg items-center flex gap-2 px-2 py-1 h-fit capitalize">
        <SelectValue placeholder="Select subject" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All subjects</SelectItem>
        {subjects.map((subject) => (
          <SelectItem value={subject} key={subject} className="capitalize">
            {subject}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default SubjectFilter;
