'use server'

import { auth } from "@clerk/nextjs/server"
import { createSupabaseClient } from "../supabase"
import { revalidatePath } from "next/cache"

export const createCompanion = async (formData: CreateCompanion) => {
    const { userId: author } = await auth()
    const supabase = createSupabaseClient()

    const { data, error } = await supabase.from('companions').insert({ ...formData, author }).select()

    if (error || !data) throw new Error(error?.message || 'Failed to create a companion');

    return data[0];

}

export const getAllCompanions = async ({ limit = 10, page = 1, subject, topic }: GetAllCompanions) => {
    const supabase = createSupabaseClient() // Llamamos al database

    const { userId } = await auth();

    let query = supabase.from('companions').select()

    if (subject && topic) {
        query = query.ilike('subject', `%${subject}%`).or(`topic.ilike.%${topic}%,name.ilike.%${topic}%`)
    } else if (subject) {
        query = query.ilike('subject', `%${subject}%`)
    } else if (topic) {
        query = query.or(`topic.ilike.%${topic}%,name.ilike.%${topic}%`)
    }

    // page 8 elements => 9
    query = query.range((page - 1) * limit, page * limit - 1)

    const { data: companions, error } = await query

    if (error) throw new Error(error.message);

    // Almacenamos los companionsId
    const companionsId = companions.map(({ id }) => id)

    // Almacenamos los companions bookmarked que tengan el mismo user que el actual y que el companion_id sea alguno de los companionsId
    const { data: bookmarks } = await supabase.from('companions_bookmarked').select().eq('user_id', userId).in('companion_id', companionsId)

    // Filtramos de los companions bookmarked solo por el id
    const marks = new Set(bookmarks?.map(({ companion_id }) => companion_id))

    // Para cada companion se le agrega el prop bookmarked true or false
    companions.forEach((companion) => {
        companion.bookmarked = marks.has(companion.id)
    })

    return companions
}

export const getCompanion = async (id: string) => {
    const supabase = createSupabaseClient()

    const { data, error } = await supabase.from('companions').select().eq('id', id)

    if (error) return console.log(error);

    return data[0]
}

export const addToSessionHistory = async (companionId: string) => {
    const { userId } = await auth();
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.from('session_history').insert({
        companion_id: companionId,
        user_id: userId
    })

    if (error) throw new Error(error.message);

    return data;
}

export const getRecentSessions = async (limit = 10) => {
    const supabase = createSupabaseClient()

    //Seleccionamos en companions todos los companion_id que haya en session_history (y sus datos) en orden del mas reciente al mas viejo
    const { data, error } = await supabase.from('session_history').select(`companions:companion_id (*)`).order('created_at', { ascending: false }).limit(limit)

    if (error) throw new Error(error.message);

    return data.map(({ companions }) => companions)
}

export const getUserSessions = async (userId: string, limit = 10) => {
    const supabase = createSupabaseClient()

    //Seleccionamos de companions la columna con el id que mandamos y todo lo que contenga
    const { data, error } = await supabase.from('session_history').select(`companions:companion_id (*)`).eq('user_id', userId).order('created_at', { ascending: false }).limit(limit)

    if (error) throw new Error(error.message);

    return data.map(({ companions }) => companions)
}

export const getUserCompanions = async (userId: string) => {
    const supabase = createSupabaseClient()

    //Seleccionamos de companions la columna con el id que mandamos y todo lo que contenga
    const { data, error } = await supabase.from('companions').select().eq('author', userId)

    if (error) throw new Error(error.message);

    return data;
}

export const newCompanionPermissions = async () => {
    const { userId, has } = await auth()
    const supabase = createSupabaseClient()

    let limit = 0

    if (has({ plan: 'pro' })) {
        return true
    } else if (has({ feature: '3_companion_limit' })) {
        limit = 3
    } else if (has({ feature: '10_companion_limit' })) {
        limit = 10
    }

    // Selecciona de la columna id y devuelve la cantidad exacta que hay de ese id
    const { data, error } = await supabase.from('companions').select('id', { count: 'exact' }).eq('author', userId)

    if (error) throw new Error(error.message);

    const companionCount = data?.length;

    if (companionCount >= limit) {
        return false
    } else {
        return true;
    }
}

export const getCompanionsBookmarked = async (userId: string, limit = 10) => {
    const supabase = createSupabaseClient()

    //Seleccionamos de companions la columna con el id que mandamos y todo lo que contenga
    const { data, error } = await supabase.from('companions_bookmarked').select(`companions:companion_id (*)`).eq('user_id', userId).order('created_at', { ascending: false }).limit(limit)

    if (error) throw new Error(error.message);

    return data.map(({ companions }) => companions)
}

export const addBookmark = async (companionId: string, path: string) => {
    const { userId } = await auth();
    if (!userId) return;
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.from('companions_bookmarked').insert({
        companion_id: companionId,
        user_id: userId
    });

    if (error) throw new Error(error.message);

    // Esto para re-renderizar la pagina
    revalidatePath(path);
    return data;
}

export const removeBookmark = async (companionId: string, path: string) => {
    const { userId } = await auth();
    if (!userId) return;
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.from('companions_bookmarked').delete().eq('companion_id', companionId).eq('user_id', userId);

    if (error) throw new Error(error.message);

    // Esto para re-renderizar la pagina
    revalidatePath(path);
    return data;
}